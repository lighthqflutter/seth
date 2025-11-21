import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { sendBankTransferApprovalNotification } from '@/lib/email/feeNotifications';

/**
 * Approve Bank Transfer Payment
 * Approves a pending bank transfer and creates payment record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, tenantId, userId } = body;

    console.log('Approve bank transfer:', { submissionId, tenantId, userId });

    // Validate required fields
    if (!submissionId || !tenantId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if adminDb is initialized
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get submission
    const submissionDoc = await adminDb
      .collection('bank_transfer_submissions')
      .doc(submissionId)
      .get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data();

    // Verify tenant matches
    if (submission?.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (submission?.status !== 'pending') {
      return NextResponse.json(
        { error: `Submission is already ${submission?.status}` },
        { status: 400 }
      );
    }

    // Get student fee details
    const studentFeeDoc = await adminDb
      .collection('studentFees')
      .doc(submission.studentFeeId)
      .get();

    if (!studentFeeDoc.exists) {
      return NextResponse.json(
        { error: 'Student fee not found' },
        { status: 404 }
      );
    }

    const studentFee = studentFeeDoc.data();

    // Get fee configuration for receipt number
    const feeConfigQuery = await adminDb
      .collection('fee_configurations')
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    let receiptNumber = `RCP${Date.now()}`;
    if (!feeConfigQuery.empty) {
      const feeConfig = feeConfigQuery.docs[0];
      const feeConfigData = feeConfig.data();
      const nextReceiptNumber = feeConfigData.nextReceiptNumber || 1;
      const receiptPrefix = feeConfigData.receiptPrefix || 'RCP';
      const receiptLength = feeConfigData.receiptNumberLength || 6;

      receiptNumber = `${receiptPrefix}${String(nextReceiptNumber).padStart(receiptLength, '0')}`;

      // Increment receipt number
      await feeConfig.ref.update({
        nextReceiptNumber: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      });
    }

    // Create payment record
    const paymentData: any = {
      tenantId,
      studentId: submission.studentId,
      studentName: submission.studentName, // Include student name for payment history
      studentFeeId: submission.studentFeeId,
      amount: submission.amount,
      paymentMethod: 'bank_transfer',
      paymentDate: Timestamp.now(), // Use current date as payment date
      bankTransferProofUrl: submission.proofUrl,
      receiptNumber,
      notes: `Bank transfer approved`,
      recordedBy: userId,
      recordedAt: Timestamp.now(),
      isRefunded: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log('Creating payment record:', {
      studentFeeId: submission.studentFeeId,
      studentId: submission.studentId,
      studentName: submission.studentName,
      amount: submission.amount,
      receiptNumber,
    });

    const paymentRef = await adminDb.collection('payments').add(paymentData);

    // Update student fee
    const amountPaid = (studentFee?.amountPaid || 0) + submission.amount;
    const amountOutstanding = Math.max(0, (studentFee?.finalAmount || 0) - amountPaid);
    const newStatus = amountOutstanding === 0 ? 'paid' : 'partial';

    await studentFeeDoc.ref.update({
      amountPaid,
      amountOutstanding,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // Update submission status
    await submissionDoc.ref.update({
      status: 'approved',
      paymentId: paymentRef.id,
      receiptNumber,
      reviewedBy: userId,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('Bank transfer approved:', {
      submissionId,
      paymentId: paymentRef.id,
      receiptNumber,
    });

    // Send approval notification email to parent (async, non-blocking)
    try {
      // Get parent details
      const parentDoc = await adminDb.collection('users').doc(submission.submittedBy).get();
      const parent = parentDoc.data();

      // Get student details
      const studentDoc = await adminDb.collection('students').doc(submission.studentId).get();
      const student = studentDoc.data();

      // Get tenant/school details
      const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
      const tenant = tenantDoc.data();

      if (parent && student && tenant) {
        // Send email notification (don't await - let it run in background)
        sendBankTransferApprovalNotification({
          parentEmail: parent.email,
          parentName: parent.name || `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
          student: {
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            currentClassName: student.currentClassName,
          },
          payment: {
            receiptNumber,
            amount: submission.amount,
            paymentMethod: 'Bank Transfer',
            paymentDate: new Date(),
            feeName: submission.feeName,
            balanceRemaining: amountOutstanding,
          },
          school: {
            name: tenant.schoolName || 'School',
            address: tenant.address,
            phone: tenant.phone,
            email: tenant.email,
            logo: tenant.logo,
          },
        }).catch(emailError => {
          console.error('Failed to send bank transfer approval email:', emailError);
        });

        console.log('Bank transfer approval email sent to:', parent.email);
      }
    } catch (emailError) {
      console.error('Error preparing bank transfer approval email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment approved successfully',
      paymentId: paymentRef.id,
      receiptNumber,
    });
  } catch (error: any) {
    console.error('Approve bank transfer error:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
