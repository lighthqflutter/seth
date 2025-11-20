'use client';

/**
 * Create New Admin User Page (Phase 14)
 * Super Admin feature for creating admin users only
 *
 * Features:
 * - Create admin accounts only (teachers and parents use specialized forms)
 * - Email validation
 * - Optional phone number
 * - Auto-generate secure password option
 * - Audit logging for user creation
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { logAudit } from '@/lib/auditLogger';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Tenant } from '@/types';

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'finance';
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Get role from query parameter, default to 'admin'
  const roleParam = searchParams.get('role');
  const initialRole = (roleParam === 'finance' ? 'finance' : 'admin') as 'admin' | 'finance';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: initialRole,
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Role validation (should be admin or finance)
    if (formData.role !== 'admin' && formData.role !== 'finance') {
      newErrors.role = 'Invalid role';
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone.trim() && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Check if email already exists
      const emailQuery = query(
        collection(db, 'users'),
        where('tenantId', '==', user.tenantId),
        where('email', '==', formData.email.toLowerCase().trim())
      );

      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        setError('A user with this email already exists');
        setSaving(false);
        return;
      }

      // Check admin quota before creating user
      if (formData.role === 'admin') {
        // Get tenant document
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (!tenantDoc.exists()) {
          setError('School information not found');
          setSaving(false);
          return;
        }

        const tenant = tenantDoc.data() as Tenant;

        // Count existing admins
        const adminsQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'admin')
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        const currentAdminCount = adminsSnapshot.size;

        // Check against maxAdmins quota
        if (currentAdminCount >= tenant.maxAdmins) {
          setError(
            `School Admin quota reached. Your school is limited to ${tenant.maxAdmins} administrators. ` +
            `You currently have ${currentAdminCount} admins.`
          );
          setSaving(false);
          return;
        }
      }

      // Get school information for invitation email
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (!tenantDoc.exists()) {
        setError('School information not found');
        setSaving(false);
        return;
      }

      const tenant = tenantDoc.data() as Tenant;
      const schoolUrl = `https://${tenant.subdomain}.seth.ng`;

      // Create user via API (creates Firebase Auth account + sends invitation)
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          tenantId: user.tenantId,
          schoolName: tenant.name,
          schoolUrl: schoolUrl,
          sendInvitation: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Audit log: User created
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'create',
        entityType: 'user',
        entityId: data.user.uid,
        entityName: formData.name.trim(),
        after: {
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          role: formData.role,
          isActive: formData.isActive,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      alert(`User created successfully! Invitation email sent to ${formData.email}`);
      router.push('/dashboard/admin/users');
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');

      // Audit log: Failed user creation
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'create',
          entityType: 'user',
          entityId: 'unknown',
          success: false,
          errorMessage: error.message || 'Failed to create user',
        });
      }

      setSaving(false);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div>
        <button
          onClick={() => router.push('/dashboard/admin/users')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Users
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Create New {formData.role === 'finance' ? 'Finance' : 'Admin'} User
        </h1>
        <p className="text-gray-600 mt-1">
          {formData.role === 'finance'
            ? 'Add a new finance user to manage fees and payments'
            : 'Add a new administrator to your school system'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="john.doe@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  User will receive login instructions at this email
                </p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (Optional)
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500' : ''}
                  placeholder="+234 800 000 0000"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  User Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as 'admin' | 'finance')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="admin">Administrator</option>
                  <option value="finance">Finance</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                )}
              </div>

              {/* Role Info */}
              {formData.role === 'admin' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm font-medium text-purple-900 mb-1">
                    Administrator Role
                  </p>
                  <p className="text-sm text-purple-700">
                    Administrators have full system access and can manage all aspects including users, students, classes, scores, and reports.
                  </p>
                </div>
              )}

              {formData.role === 'finance' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Finance Role
                  </p>
                  <p className="text-sm text-yellow-700">
                    Finance users can manage all fee-related operations including creating bills, reviewing bank transfer payments, approving/rejecting payments, and generating receipts.
                  </p>
                </div>
              )}

              {/* Info about other user types */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Creating Teachers or Parents/Guardians?
                </p>
                <p className="text-sm text-blue-700">
                  Use the specialized forms to create teacher or parent accounts with proper role-specific information:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                  <li>Teachers: Use "Add User" → "Teacher" to set up class and subject assignments</li>
                  <li>Parents/Guardians: Use "Add User" → "Parent/Guardian" to link with students</li>
                </ul>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  User is active (can log in immediately)
                </label>
              </div>

              {/* Info Note */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> After creating this user, they will need to set up their
                  password using Firebase Authentication. You may need to send them an invitation
                  email with instructions on how to access the system.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/admin/users')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}
