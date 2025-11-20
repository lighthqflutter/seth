import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Initialize Paystack Payment
 * Creates a payment transaction and returns authorization URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentFeeId, userId, tenantId } = body;

    // Validate required fields
    if (!studentFeeId || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get student fee details
    const studentFeeDoc = await adminDb.collection('studentFees').doc(studentFeeId).get();

    if (!studentFeeDoc.exists) {
      return NextResponse.json(
        { error: 'Student fee not found' },
        { status: 404 }
      );
    }

    const studentFee = studentFeeDoc.data();

    // Verify tenant matches (security check)
    if (studentFee?.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Verify amount outstanding
    if (studentFee?.amountOutstanding <= 0) {
      return NextResponse.json(
        { error: 'No outstanding amount for this fee' },
        { status: 400 }
      );
    }

    // Get payment gateway settings for this tenant
    const gatewayQuery = await adminDb
      .collection('payment_gateway_settings')
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (gatewayQuery.empty) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 400 }
      );
    }

    const gatewaySettings = gatewayQuery.docs[0].data();

    // Check if Paystack is enabled
    if (!gatewaySettings.paystack?.enabled) {
      return NextResponse.json(
        { error: 'Paystack payment method is not enabled' },
        { status: 400 }
      );
    }

    const paystackSecretKey = gatewaySettings.paystack.secretKey;

    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 400 }
      );
    }

    // Get user/guardian details
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Generate unique transaction reference
    const transactionReference = `${tenantId}_${studentFeeId}_${Date.now()}`;

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData?.email,
        amount: Math.round(studentFee.amountOutstanding * 100), // Convert to kobo
        currency: 'NGN',
        reference: transactionReference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees/payment-callback`,
        metadata: {
          tenantId,
          studentFeeId,
          studentId: studentFee.studentId,
          guardianId: userId,
          feeName: studentFee.feeName,
          custom_fields: [
            {
              display_name: 'Fee Name',
              variable_name: 'fee_name',
              value: studentFee.feeName,
            },
            {
              display_name: 'Student',
              variable_name: 'student_id',
              value: studentFee.studentId,
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      return NextResponse.json(
        { error: paystackData.message || 'Failed to initialize payment' },
        { status: 400 }
      );
    }

    // Create transaction record in database
    const transactionData = {
      tenantId,
      studentFeeId,
      studentId: studentFee.studentId,
      guardianId: userId,
      gateway: 'paystack',
      transactionReference,
      authorizationUrl: paystackData.data.authorization_url,
      amount: studentFee.amountOutstanding,
      currency: 'NGN',
      status: 'pending',
      gatewayResponse: paystackData.data,
      initiatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('online_payment_transactions').add(transactionData);

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
      reference: transactionReference,
    });
  } catch (error: any) {
    console.error('Initialize Paystack payment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
