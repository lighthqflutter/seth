import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Initialize Flutterwave Payment
 * Creates a payment transaction and returns payment link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentFeeId, userId, tenantId } = body;

    console.log('Initialize Flutterwave payment request:', { studentFeeId, userId, tenantId });

    // Validate required fields
    if (!studentFeeId || !userId || !tenantId) {
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

    // Check if Flutterwave is enabled
    if (!gatewaySettings.flutterwave?.enabled) {
      return NextResponse.json(
        { error: 'Flutterwave payment method is not enabled' },
        { status: 400 }
      );
    }

    const flutterwaveSecretKey = gatewaySettings.flutterwave.secretKey;

    if (!flutterwaveSecretKey) {
      return NextResponse.json(
        { error: 'Flutterwave secret key not configured' },
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
    const transactionReference = `FLW_${tenantId}_${studentFeeId}_${Date.now()}`;

    // Get the current host from the request to preserve subdomain
    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${host}/payment-callback`;

    console.log('Flutterwave redirect URL:', callbackUrl);

    // Initialize Flutterwave payment
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: transactionReference,
        amount: studentFee.amountOutstanding,
        currency: 'NGN',
        redirect_url: callbackUrl,
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: userData?.email,
          name: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
          phonenumber: userData?.phoneNumber || '',
        },
        customizations: {
          title: 'School Fees Payment',
          description: studentFee.feeName,
          logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/logo.png`,
        },
        meta: {
          tenantId,
          studentFeeId,
          studentId: studentFee.studentId,
          guardianId: userId,
          feeName: studentFee.feeName,
        },
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== 'success') {
      console.error('Flutterwave initialization error:', flutterwaveData);
      return NextResponse.json(
        { error: flutterwaveData.message || 'Failed to initialize payment' },
        { status: 400 }
      );
    }

    // Create transaction record in database
    const transactionData = {
      tenantId,
      studentFeeId,
      studentId: studentFee.studentId,
      guardianId: userId,
      gateway: 'flutterwave',
      transactionReference,
      authorizationUrl: flutterwaveData.data.link,
      amount: studentFee.amountOutstanding,
      currency: 'NGN',
      status: 'pending',
      gatewayResponse: flutterwaveData.data,
      initiatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('online_payment_transactions').add(transactionData);

    return NextResponse.json({
      success: true,
      authorizationUrl: flutterwaveData.data.link,
      reference: transactionReference,
    });
  } catch (error: any) {
    console.error('Initialize Flutterwave payment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
