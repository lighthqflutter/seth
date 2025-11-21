import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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

    // TODO: Send approval notification email
    // TODO: Generate PDF receipt

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
