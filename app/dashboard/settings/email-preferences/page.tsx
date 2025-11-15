'use client';

/**
 * Email Preferences Page (Phase 18)
 * Allow users to manage their email notification preferences
 *
 * Features:
 * - Toggle email notifications by type
 * - Set notification frequency
 * - Unsubscribe from specific categories
 * - View email delivery statistics
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EnvelopeIcon,
  BellIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface EmailPreferences {
  enabled: boolean;
  categories: {
    results: boolean;
    fees: boolean;
    announcements: boolean;
    newsletters: boolean;
    account: boolean;
  };
  frequency: 'instant' | 'daily' | 'weekly';
  digestEnabled: boolean;
}

export default function EmailPreferencesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState<EmailPreferences>({
    enabled: true,
    categories: {
      results: true,
      fees: true,
      announcements: true,
      newsletters: true,
      account: true,
    },
    frequency: 'instant',
    digestEnabled: false,
  });

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.emailPreferences) {
            setPreferences(userData.emailPreferences);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading preferences:', error);
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid || !user?.tenantId) return;

    setSaving(true);
    setSaved(false);

    try {
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        emailPreferences: preferences,
        updatedAt: serverTimestamp(),
      });

      // Log audit
      await logAudit({
        tenantId: user.tenantId,
        userId: user.uid,
        action: 'update',
        entityType: 'emailPreferences',
        entityId: user.uid,
        changes: preferences,
        metadata: {
          enabled: preferences.enabled,
          categoriesEnabled: Object.values(preferences.categories).filter(Boolean).length,
        },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    {
      id: 'results' as const,
      icon: '📊',
      title: 'Results & Performance',
      description: 'Notifications when results are published or grades are updated',
    },
    {
      id: 'fees' as const,
      icon: '💰',
      title: 'Fee Payments',
      description: 'Payment reminders, receipts, and billing updates',
    },
    {
      id: 'announcements' as const,
      icon: '📢',
      title: 'Important Announcements',
      description: 'Critical school announcements and urgent messages',
    },
    {
      id: 'newsletters' as const,
      icon: '📰',
      title: 'Newsletters & Updates',
      description: 'School newsletters, event updates, and general information',
    },
    {
      id: 'account' as const,
      icon: '🔐',
      title: 'Account & Security',
      description: 'Password resets, login alerts, and account changes',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Preferences</h1>
        <p className="text-gray-600 mt-1">Manage your email notification settings</p>
      </div>

      {/* Master Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellIcon className="h-6 w-6 text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">
                  {preferences.enabled
                    ? 'You are receiving email notifications'
                    : 'All email notifications are disabled'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => setPreferences({ ...preferences, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="flex items-start justify-between py-4 border-b border-gray-200 last:border-0">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{category.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.categories[category.id]}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      categories: {
                        ...preferences.categories,
                        [category.id]: e.target.checked,
                      },
                    })
                  }
                  disabled={!preferences.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Choose how often you want to receive non-urgent notifications
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={preferences.frequency === 'instant'}
                onChange={() => setPreferences({ ...preferences, frequency: 'instant' })}
                disabled={!preferences.enabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Instant</div>
                <div className="text-sm text-gray-600">Receive emails immediately as they occur</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={preferences.frequency === 'daily'}
                onChange={() => setPreferences({ ...preferences, frequency: 'daily' })}
                disabled={!preferences.enabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Daily Digest</div>
                <div className="text-sm text-gray-600">Receive one email per day with all updates</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={preferences.frequency === 'weekly'}
                onChange={() => setPreferences({ ...preferences, frequency: 'weekly' })}
                disabled={!preferences.enabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Weekly Digest</div>
                <div className="text-sm text-gray-600">Receive one email per week with all updates</div>
              </div>
            </label>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Important notifications (password resets, urgent announcements) will always be sent immediately
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !preferences.enabled}
          className="flex-1"
        >
          {saving ? 'Saving...' : saved ? (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Saved!
            </>
          ) : 'Save Preferences'}
        </Button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          Your email preferences have been saved successfully.
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            <EnvelopeIcon className="h-5 w-5 inline mr-2" />
            About Email Notifications
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• You can unsubscribe from specific types of emails while keeping others active</li>
            <li>• Critical notifications (password resets, security alerts) cannot be disabled</li>
            <li>• Changes take effect immediately and apply to all future emails</li>
            <li>• You can update these preferences at any time</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
