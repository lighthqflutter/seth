import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Verify Paystack Payment
 * Verifies payment with Paystack and updates records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, tenantId } = body;

    console.log('Verify payment request:', { reference, tenantId });

    // Validate required fields
    if (!reference || !tenantId) {
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

    // Get transaction record
    const transactionsQuery = await adminDb
      .collection('online_payment_transactions')
      .where('tenantId', '==', tenantId)
      .where('transactionReference', '==', reference)
      .limit(1)
      .get();

    if (transactionsQuery.empty) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transactionDoc = transactionsQuery.docs[0];
    const transaction = transactionDoc.data();

    // Check if already processed
    if (transaction.status === 'successful') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        paymentId: transaction.paymentId,
      });
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
    const paystackSecretKey = gatewaySettings.paystack?.secretKey;

    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      // Update transaction as failed
      await transactionDoc.ref.update({
        status: 'failed',
        gatewayResponse: verifyData,
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Payment successful - get student fee details
    const studentFeeDoc = await adminDb
      .collection('studentFees')
      .doc(transaction.studentFeeId)
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
    const paymentData = {
      tenantId,
      studentId: transaction.studentId,
      studentFeeId: transaction.studentFeeId,
      amount: verifyData.data.amount / 100, // Convert from kobo
      paymentMethod: 'online_paystack',
      paymentDate: Timestamp.now(),
      onlineTransactionId: verifyData.data.id,
      onlinePaymentGateway: 'paystack',
      onlinePaymentStatus: 'successful',
      transactionReference: reference,
      receiptNumber,
      receiptUrl: undefined, // TODO: Generate PDF receipt
      notes: `Paystack payment - ${verifyData.data.channel}`,
      recordedBy: transaction.guardianId,
      recordedAt: Timestamp.now(),
      isRefunded: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const paymentRef = await adminDb.collection('payments').add(paymentData);

    // Update student fee
    const amountPaid = (studentFee?.amountPaid || 0) + (verifyData.data.amount / 100);
    const amountOutstanding = Math.max(0, (studentFee?.finalAmount || 0) - amountPaid);
    const newStatus = amountOutstanding === 0 ? 'paid' : 'partial';

    await studentFeeDoc.ref.update({
      amountPaid,
      amountOutstanding,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // Update transaction record
    await transactionDoc.ref.update({
      status: 'successful',
      paymentId: paymentRef.id,
      paidAt: Timestamp.now(),
      gatewayResponse: verifyData,
      updatedAt: Timestamp.now(),
    });

    // TODO: Send payment confirmation email
    // TODO: Generate PDF receipt

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: paymentRef.id,
      receiptNumber,
      amount: verifyData.data.amount / 100,
    });
  } catch (error: any) {
    console.error('Verify Paystack payment error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
