'use client';

/**
 * Payment Callback Page
 * Handles redirect after payment with Paystack/Flutterwave
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref'); // Paystack uses this
      const transaction_id = searchParams.get('transaction_id'); // Flutterwave uses this

      const paymentReference = reference || trxref || transaction_id;

      if (!paymentReference) {
        setStatus('failed');
        setMessage('No payment reference found');
        return;
      }

      // Wait for auth to finish loading
      if (loading) {
        return;
      }

      if (!user?.tenantId) {
        setStatus('failed');
        setMessage('Authentication required. Please log in and try again.');
        return;
      }

      try {
        // Determine which gateway to verify with
        const isFlutterwave = !!transaction_id;
        const endpoint = isFlutterwave
          ? '/api/payments/verify-flutterwave'
          : '/api/payments/verify-paystack';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: paymentReference,
            tenantId: user.tenantId,
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

    if (!loading) {
      verifyPayment();
    }
  }, [searchParams, user, loading]);

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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="space-y-3">
                {message.includes('Authentication') ? (
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full"
                  >
                    Login to Continue
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push('/parent/fees')}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => router.push('/parent/dashboard')}
                      variant="outline"
                      className="w-full"
                    >
                      Go to Dashboard
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
