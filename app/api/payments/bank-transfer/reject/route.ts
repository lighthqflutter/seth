import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendBankTransferRejectionNotification } from '@/lib/email/feeNotifications';

/**
 * Reject Bank Transfer Payment
 * Rejects a pending bank transfer submission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, tenantId, userId, reason } = body;

    console.log('Reject bank transfer:', { submissionId, tenantId, userId });

    // Validate required fields
    if (!submissionId || !tenantId || !userId || !reason) {
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

    // Update submission status
    await submissionDoc.ref.update({
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: userId,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('Bank transfer rejected:', {
      submissionId,
      reason: reason.trim(),
    });

    // Send rejection notification email to parent (async, non-blocking)
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
        sendBankTransferRejectionNotification({
          parentEmail: parent.email,
          parentName: parent.name || `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
          student: {
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            currentClassName: student.currentClassName,
          },
          transfer: {
            amount: submission.amount,
            feeName: submission.feeName,
            fileName: submission.fileName,
            submittedAt: submission.submittedAt?.toDate ? submission.submittedAt.toDate() : new Date(submission.submittedAt),
          },
          rejectionReason: reason.trim(),
          school: {
            name: tenant.schoolName || 'School',
            address: tenant.address,
            phone: tenant.phone,
            email: tenant.email,
            logo: tenant.logo,
          },
        }).catch(emailError => {
          console.error('Failed to send bank transfer rejection email:', emailError);
        });

        console.log('Bank transfer rejection email sent to:', parent.email);
      }
    } catch (emailError) {
      console.error('Error preparing bank transfer rejection email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject bank transfer error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reject payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
