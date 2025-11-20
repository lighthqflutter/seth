import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Get Receipt Data
 * Returns payment, student fee, student, and school data for receipt generation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const receiptId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');

    if (!receiptId || !tenantId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Try to load as payment ID first
    let paymentDoc = await adminDb.collection('payments').doc(receiptId).get();
    let paymentData: any = null;

    if (paymentDoc.exists) {
      // Direct payment ID was provided
      paymentData = { id: paymentDoc.id, ...paymentDoc.data() };
    } else {
      // Try loading as studentFeeId - get most recent payment for this fee
      const paymentsQuery = await adminDb
        .collection('payments')
        .where('studentFeeId', '==', receiptId)
        .where('tenantId', '==', tenantId)
        .orderBy('paymentDate', 'desc')
        .limit(1)
        .get();

      if (paymentsQuery.empty) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        );
      }

      paymentData = {
        id: paymentsQuery.docs[0].id,
        ...paymentsQuery.docs[0].data(),
      };
    }

    // Verify tenant matches
    if (paymentData.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Load student fee
    const feeDoc = await adminDb
      .collection('studentFees')
      .doc(paymentData.studentFeeId)
      .get();

    if (!feeDoc.exists) {
      return NextResponse.json(
        { error: 'Student fee not found' },
        { status: 404 }
      );
    }

    const studentFeeData = { id: feeDoc.id, ...feeDoc.data() };

    // Load student
    const studentDoc = await adminDb
      .collection('students')
      .doc(paymentData.studentId)
      .get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const studentData = { id: studentDoc.id, ...studentDoc.data() };

    // Load school info (tenant)
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();

    let schoolData: any = {
      name: 'School Name',
      address: 'School Address',
      phone: 'N/A',
      email: 'N/A',
    };

    if (tenantDoc.exists) {
      const tenantData = tenantDoc.data();
      schoolData = {
        name: tenantData?.schoolName || 'School Name',
        address: tenantData?.address || 'School Address',
        phone: tenantData?.phone || 'N/A',
        email: tenantData?.email || 'N/A',
        logo: tenantData?.logo,
      };
    }

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const serializeTimestamp = (timestamp: any) => {
      if (timestamp && timestamp.toDate) {
        return timestamp.toDate().toISOString();
      }
      return timestamp;
    };

    return NextResponse.json({
      success: true,
      payment: {
        ...paymentData,
        paymentDate: serializeTimestamp(paymentData.paymentDate),
        recordedAt: serializeTimestamp(paymentData.recordedAt),
        createdAt: serializeTimestamp(paymentData.createdAt),
        updatedAt: serializeTimestamp(paymentData.updatedAt),
      },
      studentFee: {
        ...studentFeeData,
        dueDate: serializeTimestamp(studentFeeData.dueDate),
        createdAt: serializeTimestamp(studentFeeData.createdAt),
        updatedAt: serializeTimestamp(studentFeeData.updatedAt),
      },
      student: {
        ...studentData,
        dateOfBirth: serializeTimestamp(studentData.dateOfBirth),
        admissionDate: serializeTimestamp(studentData.admissionDate),
        createdAt: serializeTimestamp(studentData.createdAt),
        updatedAt: serializeTimestamp(studentData.updatedAt),
      },
      school: schoolData,
    });
  } catch (error: any) {
    console.error('Get receipt error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load receipt',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
