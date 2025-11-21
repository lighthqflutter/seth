'use client';

/**
 * Public Payment Callback Page
 * Handles redirect after payment with Paystack/Flutterwave
 * This page is public (not in parent layout) to avoid auth redirect issues
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Firebase Auth to initialize
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get their tenant ID
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const userTenantId = idTokenResult.claims.tenantId as string;
        setTenantId(userTenantId);

        // Now verify payment
        verifyPayment(userTenantId);
      } else {
        // No user signed in - redirect to login with return URL
        const currentUrl = window.location.href;
        router.push(`/login?returnUrl=${encodeURIComponent(currentUrl)}`);
      }
    });

    return () => unsubscribe();
  }, []);

  const verifyPayment = async (userTenantId: string) => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref'); // Paystack uses this
    const tx_ref = searchParams.get('tx_ref'); // Flutterwave uses this (our custom reference)
    const transaction_id = searchParams.get('transaction_id'); // Flutterwave uses this (their internal ID)

    // For Flutterwave, prefer tx_ref (our custom reference) over transaction_id
    const paymentReference = reference || trxref || tx_ref || transaction_id;

    if (!paymentReference) {
      setStatus('failed');
      setMessage('No payment reference found in the URL');
      return;
    }

    try {
      // Determine which gateway to verify with
      // Flutterwave sends tx_ref and/or transaction_id
      const isFlutterwave = !!tx_ref || !!transaction_id;
      const endpoint = isFlutterwave
        ? '/api/payments/verify-flutterwave'
        : '/api/payments/verify-paystack';

      console.log('Verifying payment:', {
        reference: paymentReference,
        gateway: isFlutterwave ? 'flutterwave' : 'paystack',
        tenantId: userTenantId,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: paymentReference,
          tenantId: userTenantId,
        }),
      });

      const data = await response.json();

      console.log('Verification response:', { status: response.status, data });

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Payment verified successfully!');
        setPaymentDetails({
          receiptNumber: data.receiptNumber,
          amount: data.amount,
        });
      } else {
        setStatus('failed');
        const errorMessage = data.error || 'Payment verification failed';
        const errorDetails = data.details ? ` - ${data.details}` : '';
        setMessage(errorMessage + errorDetails);
        console.error('Verification failed:', data);
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(`An error occurred while verifying your payment: ${error.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          {status === 'verifying' && (
            <div className="text-center py-8">
              <ArrowPathIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">Please wait while we confirm your payment...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              {paymentDetails && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Receipt Number:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {paymentDetails.receiptNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount Paid:</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(paymentDetails.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/parent/fees')}
                  className="w-full"
                >
                  View Fees Dashboard
                </Button>
                <Button
                  onClick={() => router.push('/parent/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center py-8">
              <XCircleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/parent/fees')}
                  className="w-full"
                >
                  Return to Fees
                </Button>
                <Button
                  onClick={() => router.push('/parent/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <ArrowPathIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
              <p className="text-gray-600">Please wait</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
