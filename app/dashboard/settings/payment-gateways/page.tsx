'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentGatewaySettings } from '@/types/fees';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function PaymentGatewaySettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Paystack
    paystackEnabled: false,
    paystackPublicKey: '',
    paystackSecretKey: '',
    paystackWebhookUrl: '',

    // Flutterwave
    flutterwaveEnabled: false,
    flutterwavePublicKey: '',
    flutterwaveSecretKey: '',
    flutterwaveWebhookUrl: '',

    // Bank Transfer
    bankTransferEnabled: false,
    bankName: '',
    accountName: '',
    accountNumber: '',
    bankInstructions: '',

    // Default
    defaultPaymentMethod: 'paystack' as 'paystack' | 'flutterwave' | 'bank_transfer',
  });

  // Check admin/finance access
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'finance') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.tenantId) return;

      try {
        const settingsQuery = query(
          collection(db, 'payment_gateway_settings'),
          where('tenantId', '==', user.tenantId)
        );
        const settingsSnapshot = await getDocs(settingsQuery);

        if (!settingsSnapshot.empty) {
          const settingsDoc = settingsSnapshot.docs[0];
          const settings = settingsDoc.data() as PaymentGatewaySettings;
          setSettingsId(settingsDoc.id);

          setFormData({
            paystackEnabled: settings.paystack?.enabled || false,
            paystackPublicKey: settings.paystack?.publicKey || '',
            paystackSecretKey: settings.paystack?.secretKey || '',
            paystackWebhookUrl: settings.paystack?.webhookUrl || '',

            flutterwaveEnabled: settings.flutterwave?.enabled || false,
            flutterwavePublicKey: settings.flutterwave?.publicKey || '',
            flutterwaveSecretKey: settings.flutterwave?.secretKey || '',
            flutterwaveWebhookUrl: settings.flutterwave?.webhookUrl || '',

            bankTransferEnabled: settings.bankTransfer?.enabled || false,
            bankName: settings.bankTransfer?.bankName || '',
            accountName: settings.bankTransfer?.accountName || '',
            accountNumber: settings.bankTransfer?.accountNumber || '',
            bankInstructions: settings.bankTransfer?.instructions || '',

            defaultPaymentMethod: settings.defaultPaymentMethod || 'paystack',
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading payment settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.tenantId]);

  const handleSave = async () => {
    if (!user?.tenantId) return;

    // Validation
    if (formData.paystackEnabled && (!formData.paystackPublicKey || !formData.paystackSecretKey)) {
      alert('Please provide both Paystack public and secret keys');
      return;
    }

    if (formData.flutterwaveEnabled && (!formData.flutterwavePublicKey || !formData.flutterwaveSecretKey)) {
      alert('Please provide both Flutterwave public and secret keys');
      return;
    }

    if (formData.bankTransferEnabled && (!formData.bankName || !formData.accountName || !formData.accountNumber)) {
      alert('Please provide complete bank account details');
      return;
    }

    if (!formData.paystackEnabled && !formData.flutterwaveEnabled && !formData.bankTransferEnabled) {
      alert('Please enable at least one payment method');
      return;
    }

    setSaving(true);

    try {
      const settingsData: Omit<PaymentGatewaySettings, 'id'> = {
        tenantId: user.tenantId,
        paystack: {
          enabled: formData.paystackEnabled,
          publicKey: formData.paystackPublicKey,
          secretKey: formData.paystackSecretKey,
          webhookUrl: formData.paystackWebhookUrl,
        },
        flutterwave: {
          enabled: formData.flutterwaveEnabled,
          publicKey: formData.flutterwavePublicKey,
          secretKey: formData.flutterwaveSecretKey,
          webhookUrl: formData.flutterwaveWebhookUrl,
        },
        bankTransfer: {
          enabled: formData.bankTransferEnabled,
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          instructions: formData.bankInstructions,
        },
        defaultPaymentMethod: formData.defaultPaymentMethod,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      };

      if (settingsId) {
        // Update existing
        await updateDoc(doc(db, 'payment_gateway_settings', settingsId), {
          ...settingsData,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'payment_gateway_settings'), settingsData);
        setSettingsId(docRef.id);
      }

      alert('Payment gateway settings saved successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Settings
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Payment Gateway Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure payment methods for online fee collection
        </p>
      </div>

      {/* Security Notice */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Security Notice</h3>
              <p className="text-sm text-yellow-800">
                Your API keys are encrypted and stored securely. Only use keys from your own Paystack/Flutterwave account.
                Never share your secret keys with anyone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paystack Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Paystack</CardTitle>
              <CardDescription>Accept payments via Paystack</CardDescription>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.paystackEnabled}
                onChange={(e) => setFormData({ ...formData, paystackEnabled: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public Key
            </label>
            <Input
              value={formData.paystackPublicKey}
              onChange={(e) => setFormData({ ...formData, paystackPublicKey: e.target.value })}
              placeholder="pk_test_xxxxxxxxxxxxxxxx"
              disabled={!formData.paystackEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Key
            </label>
            <Input
              type="password"
              value={formData.paystackSecretKey}
              onChange={(e) => setFormData({ ...formData, paystackSecretKey: e.target.value })}
              placeholder="sk_test_xxxxxxxxxxxxxxxx"
              disabled={!formData.paystackEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL (Copy this to your Paystack dashboard)
            </label>
            <div className="flex gap-2">
              <Input
                value={`${webhookBaseUrl}/api/webhooks/paystack`}
                readOnly
                className="bg-gray-50"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${webhookBaseUrl}/api/webhooks/paystack`);
                  alert('Webhook URL copied to clipboard!');
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add this URL to your Paystack dashboard under Settings → Webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Flutterwave Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flutterwave</CardTitle>
              <CardDescription>Accept payments via Flutterwave</CardDescription>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.flutterwaveEnabled}
                onChange={(e) => setFormData({ ...formData, flutterwaveEnabled: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Public Key
            </label>
            <Input
              value={formData.flutterwavePublicKey}
              onChange={(e) => setFormData({ ...formData, flutterwavePublicKey: e.target.value })}
              placeholder="FLWPUBK_TEST-xxxxxxxxxxxxxxxx"
              disabled={!formData.flutterwaveEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret Key
            </label>
            <Input
              type="password"
              value={formData.flutterwaveSecretKey}
              onChange={(e) => setFormData({ ...formData, flutterwaveSecretKey: e.target.value })}
              placeholder="FLWSECK_TEST-xxxxxxxxxxxxxxxx"
              disabled={!formData.flutterwaveEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL (Copy this to your Flutterwave dashboard)
            </label>
            <div className="flex gap-2">
              <Input
                value={`${webhookBaseUrl}/api/webhooks/flutterwave`}
                readOnly
                className="bg-gray-50"
              />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${webhookBaseUrl}/api/webhooks/flutterwave`);
                  alert('Webhook URL copied to clipboard!');
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add this URL to your Flutterwave dashboard under Settings → Webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Transfer</CardTitle>
              <CardDescription>Accept manual bank transfers with proof upload</CardDescription>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.bankTransferEnabled}
                onChange={(e) => setFormData({ ...formData, bankTransferEnabled: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name
            </label>
            <Input
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g., Access Bank"
              disabled={!formData.bankTransferEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name
            </label>
            <Input
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="School name"
              disabled={!formData.bankTransferEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <Input
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="1234567890"
              disabled={!formData.bankTransferEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions (Optional)
            </label>
            <textarea
              value={formData.bankInstructions}
              onChange={(e) => setFormData({ ...formData, bankInstructions: e.target.value })}
              placeholder="Additional instructions for parents making bank transfers..."
              disabled={!formData.bankTransferEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Default Payment Method</CardTitle>
          <CardDescription>Primary payment option shown to parents</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={formData.defaultPaymentMethod}
            onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="paystack" disabled={!formData.paystackEnabled}>Paystack</option>
            <option value="flutterwave" disabled={!formData.flutterwaveEnabled}>Flutterwave</option>
            <option value="bank_transfer" disabled={!formData.bankTransferEnabled}>Bank Transfer</option>
          </select>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
