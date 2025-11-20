'use client';

import { useState } from 'react';
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: {
    id: string;
    feeName: string;
    studentName: string;
    amountOutstanding: number;
  };
  gatewaySettings: {
    paystack?: {
      enabled: boolean;
      publicKey: string;
    };
    flutterwave?: {
      enabled: boolean;
      publicKey: string;
    };
  };
  userId: string;
  tenantId: string;
  onPaymentSuccess?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  fee,
  gatewaySettings,
  userId,
  tenantId,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handlePayWithPaystack = async () => {
    setProcessing(true);
    setError('');

    try {
      // Initialize payment
      const response = await fetch('/api/payments/initialize-paystack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFeeId: fee.id,
          userId,
          tenantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack payment page
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setProcessing(false);
    }
  };

  const handlePayWithFlutterwave = async () => {
    setProcessing(true);
    setError('');

    try {
      // Initialize payment
      const response = await fetch('/api/payments/initialize-flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFeeId: fee.id,
          userId,
          tenantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Flutterwave payment page
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={processing}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Make Payment</h2>
            <p className="text-gray-600 mt-1">Choose your preferred payment method</p>
          </div>

          {/* Fee Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fee:</span>
                <span className="text-sm font-medium text-gray-900">{fee.feeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Student:</span>
                <span className="text-sm font-medium text-gray-900">{fee.studentName}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-base font-semibold text-gray-900">Amount to Pay:</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(fee.amountOutstanding)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Payment Options */}
          <div className="space-y-3">
            {gatewaySettings.paystack?.enabled && (
              <Button
                onClick={handlePayWithPaystack}
                disabled={processing}
                className="w-full h-14 text-base bg-blue-600 hover:bg-blue-700"
              >
                <CreditCardIcon className="h-6 w-6 mr-3" />
                {processing ? 'Processing...' : 'Pay with Paystack'}
              </Button>
            )}

            {gatewaySettings.flutterwave?.enabled && (
              <Button
                onClick={handlePayWithFlutterwave}
                disabled={processing}
                className="w-full h-14 text-base bg-orange-600 hover:bg-orange-700"
              >
                <CreditCardIcon className="h-6 w-6 mr-3" />
                {processing ? 'Processing...' : 'Pay with Flutterwave'}
              </Button>
            )}
          </div>

          {/* Security Note */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Secure Payment:</strong> You will be redirected to a secure payment page.
              Your payment information is encrypted and secure.
            </p>
          </div>

          {/* Cancel Button */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
