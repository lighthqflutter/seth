import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

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

    // TODO: Send rejection notification email to parent

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
