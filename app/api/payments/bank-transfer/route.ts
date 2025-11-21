import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Submit Bank Transfer Payment
 * Creates a pending bank transfer record for finance approval
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentFeeId,
      userId,
      tenantId,
      amount,
      proofUrl,
      fileName,
    } = body;

    console.log('Bank transfer submission:', {
      studentFeeId,
      userId,
      tenantId,
      amount,
    });

    // Validate required fields
    if (
      !studentFeeId ||
      !userId ||
      !tenantId ||
      !amount ||
      !proofUrl
    ) {
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

    // Get student fee details
    const studentFeeDoc = await adminDb
      .collection('studentFees')
      .doc(studentFeeId)
      .get();

    if (!studentFeeDoc.exists) {
      return NextResponse.json({ error: 'Student fee not found' }, { status: 404 });
    }

    const studentFee = studentFeeDoc.data();

    // Verify tenant matches (security check)
    if (studentFee?.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Verify amount is valid
    if (amount <= 0 || amount > studentFee?.amountOutstanding) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Create bank transfer submission record
    const submissionData = {
      tenantId,
      studentFeeId,
      studentId: studentFee.studentId,
      studentName: studentFee.studentName,
      submittedBy: userId,
      amount,
      proofUrl,
      fileName,
      status: 'pending', // pending, approved, rejected
      feeName: studentFee.feeName,
      submittedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const submissionRef = await adminDb
      .collection('bank_transfer_submissions')
      .add(submissionData);

    console.log('Bank transfer submission created:', submissionRef.id);

    // TODO: Send notification to finance team
    // TODO: Send confirmation email to parent

    return NextResponse.json({
      success: true,
      message: 'Bank transfer submitted successfully',
      submissionId: submissionRef.id,
    });
  } catch (error: any) {
    console.error('Bank transfer submission error:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit bank transfer',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get Bank Transfer Submissions
 * Returns submissions for a specific user or all pending submissions (for finance users)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    // Check if adminDb is initialized
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let query = adminDb
      .collection('bank_transfer_submissions')
      .where('tenantId', '==', tenantId);

    // Filter by user if provided (for parents viewing their own submissions)
    if (userId) {
      query = query.where('submittedBy', '==', userId);
    }

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    // Order by submission date (newest first)
    query = query.orderBy('submittedAt', 'desc');

    let snapshot;
    try {
      snapshot = await query.get();
    } catch (queryError: any) {
      // If index error, try without orderBy
      if (queryError.message && queryError.message.includes('index')) {
        console.warn('Firestore index required, fetching without orderBy');

        // Retry without orderBy
        let retryQuery = adminDb
          .collection('bank_transfer_submissions')
          .where('tenantId', '==', tenantId);

        if (userId) {
          retryQuery = retryQuery.where('submittedBy', '==', userId);
        }

        if (status) {
          retryQuery = retryQuery.where('status', '==', status);
        }

        snapshot = await retryQuery.get();
      } else {
        throw queryError;
      }
    }

    const submissions = snapshot.docs.map((doc: any) => {
      const data = doc.data();

      // Helper to safely convert Firestore timestamp
      const toISOString = (timestamp: any) => {
        if (!timestamp) return undefined;
        if (timestamp.toDate) return timestamp.toDate().toISOString();
        if (timestamp instanceof Date) return timestamp.toISOString();
        return timestamp;
      };

      return {
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings for JSON serialization
        submittedAt: toISOString(data.submittedAt),
        reviewedAt: toISOString(data.reviewedAt),
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      };
    });

    // Sort by submittedAt descending (newest first) in case we couldn't use orderBy
    submissions.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error: any) {
    console.error('Get bank transfer submissions error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Failed to retrieve submissions',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
