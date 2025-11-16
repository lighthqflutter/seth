'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeftIcon,
  CogIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface FeeConfiguration {
  currency: string;
  currencySymbol: string;
  defaultPaymentMethods: string[];
  lateFeeEnabled: boolean;
  lateFeePercentage: number;
  lateFeeGracePeriodDays: number;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  allowPartialPayments: boolean;
  minPartialPaymentPercentage: number;
}

const DEFAULT_PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card'];

export default function FeeConfigurationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<FeeConfiguration>({
    currency: 'NGN',
    currencySymbol: '₦',
    defaultPaymentMethods: DEFAULT_PAYMENT_METHODS,
    lateFeeEnabled: false,
    lateFeePercentage: 5,
    lateFeeGracePeriodDays: 7,
    reminderEnabled: true,
    reminderDaysBefore: 7,
    allowPartialPayments: true,
    minPartialPaymentPercentage: 25,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.tenantId) return;
    loadConfiguration();
  }, [user]);

  const loadConfiguration = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const configDoc = await getDoc(doc(db, 'tenants', user.tenantId));

      if (configDoc.exists()) {
        const data = configDoc.data();
        if (data.feeConfiguration) {
          setConfig({
            ...config,
            ...data.feeConfiguration,
          });
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FeeConfiguration, value: any) => {
    setConfig({ ...config, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.currency.trim()) {
      newErrors.currency = 'Currency code is required';
    }

    if (!config.currencySymbol.trim()) {
      newErrors.currencySymbol = 'Currency symbol is required';
    }

    if (config.lateFeeEnabled) {
      if (config.lateFeePercentage < 0 || config.lateFeePercentage > 100) {
        newErrors.lateFeePercentage = 'Late fee percentage must be between 0 and 100';
      }
      if (config.lateFeeGracePeriodDays < 0) {
        newErrors.lateFeeGracePeriodDays = 'Grace period cannot be negative';
      }
    }

    if (config.reminderEnabled && config.reminderDaysBefore < 0) {
      newErrors.reminderDaysBefore = 'Reminder days cannot be negative';
    }

    if (config.allowPartialPayments) {
      if (config.minPartialPaymentPercentage < 0 || config.minPartialPaymentPercentage > 100) {
        newErrors.minPartialPaymentPercentage = 'Minimum percentage must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // Update tenant document with fee configuration
      await setDoc(
        doc(db, 'tenants', user!.tenantId),
        {
          feeConfiguration: config,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      alert('Fee configuration saved successfully!');
      router.push('/dashboard/fees');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/fees')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CogIcon className="h-8 w-8" />
            Fee Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure fee management settings and policies
          </p>
        </div>
      </div>

      {/* Currency Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency Code</Label>
              <Input
                id="currency"
                value={config.currency}
                onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
                placeholder="e.g., NGN, USD, GBP"
                maxLength={3}
              />
              {errors.currency && (
                <p className="text-red-600 text-sm mt-1">{errors.currency}</p>
              )}
            </div>
            <div>
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input
                id="currencySymbol"
                value={config.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                placeholder="e.g., ₦, $, £"
              />
              {errors.currencySymbol && (
                <p className="text-red-600 text-sm mt-1">{errors.currencySymbol}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Late Fee Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Late Fee Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="lateFeeEnabled"
              checked={config.lateFeeEnabled}
              onChange={(e) => handleChange('lateFeeEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <Label htmlFor="lateFeeEnabled" className="cursor-pointer">
              Enable late fees for overdue payments
            </Label>
          </div>

          {config.lateFeeEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="lateFeePercentage">Late Fee Percentage (%)</Label>
                <Input
                  id="lateFeePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.lateFeePercentage}
                  onChange={(e) => handleChange('lateFeePercentage', parseFloat(e.target.value))}
                />
                {errors.lateFeePercentage && (
                  <p className="text-red-600 text-sm mt-1">{errors.lateFeePercentage}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lateFeeGracePeriodDays">Grace Period (Days)</Label>
                <Input
                  id="lateFeeGracePeriodDays"
                  type="number"
                  min="0"
                  value={config.lateFeeGracePeriodDays}
                  onChange={(e) => handleChange('lateFeeGracePeriodDays', parseInt(e.target.value))}
                />
                {errors.lateFeeGracePeriodDays && (
                  <p className="text-red-600 text-sm mt-1">{errors.lateFeeGracePeriodDays}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Days after due date before late fee applies
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Reminders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="reminderEnabled"
              checked={config.reminderEnabled}
              onChange={(e) => handleChange('reminderEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <Label htmlFor="reminderEnabled" className="cursor-pointer">
              Send payment reminders to guardians
            </Label>
          </div>

          {config.reminderEnabled && (
            <div>
              <Label htmlFor="reminderDaysBefore">Days Before Due Date</Label>
              <Input
                id="reminderDaysBefore"
                type="number"
                min="0"
                value={config.reminderDaysBefore}
                onChange={(e) => handleChange('reminderDaysBefore', parseInt(e.target.value))}
                className="max-w-xs"
              />
              {errors.reminderDaysBefore && (
                <p className="text-red-600 text-sm mt-1">{errors.reminderDaysBefore}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Send reminders this many days before the due date
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partial Payments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Partial Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allowPartialPayments"
              checked={config.allowPartialPayments}
              onChange={(e) => handleChange('allowPartialPayments', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <Label htmlFor="allowPartialPayments" className="cursor-pointer">
              Allow partial payments for fees
            </Label>
          </div>

          {config.allowPartialPayments && (
            <div>
              <Label htmlFor="minPartialPaymentPercentage">Minimum Payment Percentage (%)</Label>
              <Input
                id="minPartialPaymentPercentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={config.minPartialPaymentPercentage}
                onChange={(e) => handleChange('minPartialPaymentPercentage', parseFloat(e.target.value))}
                className="max-w-xs"
              />
              {errors.minPartialPaymentPercentage && (
                <p className="text-red-600 text-sm mt-1">{errors.minPartialPaymentPercentage}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Minimum percentage of total fee that must be paid at once
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/fees')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
