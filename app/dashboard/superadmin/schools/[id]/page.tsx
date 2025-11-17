'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tenant } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ManageSchoolPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [maxStudents, setMaxStudents] = useState(50);
  const [maxAdmins, setMaxAdmins] = useState(3);
  const [status, setStatus] = useState<'active' | 'trial' | 'suspended'>('trial');
  const [plan, setPlan] = useState<'free' | 'basic' | 'premium'>('free');

  // Check if user is super admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/dashboard/superadmin/schools');
      } else if (user.role !== 'superadmin') {
        router.push('/dashboard');
      } else {
        loadSchool();
      }
    }
  }, [user, authLoading, router, schoolId]);

  const loadSchool = async () => {
    try {
      setLoading(true);
      setError('');

      const schoolDoc = await getDoc(doc(db, 'tenants', schoolId));

      if (!schoolDoc.exists()) {
        setError('School not found');
        return;
      }

      const schoolData = schoolDoc.data() as Tenant;
      setSchool(schoolData);
      setMaxStudents(schoolData.maxStudents);
      setMaxAdmins(schoolData.maxAdmins);
      setStatus(schoolData.status);
      setPlan(schoolData.plan);
    } catch (err: any) {
      console.error('Error loading school:', err);
      setError('Failed to load school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await updateDoc(doc(db, 'tenants', schoolId), {
        maxStudents,
        maxAdmins,
        status,
        plan,
        updatedAt: new Date(),
      });

      setSuccess('School updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating school:', err);
      setError('Failed to update school. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show content if super admin
  if (user.role !== 'superadmin') {
    return null; // Will redirect via useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading school...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !school) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </div>
          <div className="mt-4">
            <Link href="/dashboard/superadmin/schools">
              <Button variant="outline">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Schools
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard/superadmin/schools">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Schools
              </Button>
            </Link>
            <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              🔒 Super Admin
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Manage School</h1>
          <p className="text-gray-600 mt-1">{school?.name}</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* School Info */}
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>Basic details about the school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">School Name</div>
                <div className="text-gray-900">{school?.name}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Subdomain</div>
                <div className="text-gray-900">{school?.subdomain}.seth.ng</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Email</div>
                <div className="text-gray-900">{school?.email || 'N/A'}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Phone</div>
                <div className="text-gray-900">{school?.phone || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quota Management */}
        <Card>
          <CardHeader>
            <CardTitle>Quotas</CardTitle>
            <CardDescription>Manage school quotas and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Quota
              </label>
              <Input
                type="number"
                min="1"
                max="10000"
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value) || 0)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of students this school can onboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Admin Quota
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={maxAdmins}
                onChange={(e) => setMaxAdmins(parseInt(e.target.value) || 0)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of school administrators (recommended: 3)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status & Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Plan</CardTitle>
            <CardDescription>Manage school status and subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'trial' | 'suspended')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as 'free' | 'basic' | 'premium')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href="/dashboard/superadmin/schools">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
