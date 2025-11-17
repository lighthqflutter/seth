'use client';

/**
 * Create New User Page (Phase 14)
 * Super Admin feature for creating new users
 *
 * Features:
 * - Create admin, teacher, or parent accounts
 * - Email validation
 * - Optional phone number
 * - Auto-generate secure password option
 * - Audit logging for user creation
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
  role: 'admin' | 'teacher' | 'parent' | '';
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
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
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

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
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

      // Check quotas before creating user
      if (formData.role === 'teacher' || formData.role === 'admin') {
        // Get tenant document
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (!tenantDoc.exists()) {
          setError('School information not found');
          setSaving(false);
          return;
        }

        const tenant = tenantDoc.data() as Tenant;

        if (formData.role === 'teacher') {
          // Count existing teachers
          const teachersQuery = query(
            collection(db, 'users'),
            where('tenantId', '==', user.tenantId),
            where('role', '==', 'teacher')
          );
          const teachersSnapshot = await getDocs(teachersQuery);
          const currentTeacherCount = teachersSnapshot.size;

          // Count classes
          const classesQuery = query(
            collection(db, 'classes'),
            where('tenantId', '==', user.tenantId)
          );
          const classesSnapshot = await getDocs(classesQuery);
          const classCount = classesSnapshot.size;

          // Teachers can only be 1 ahead of classes
          if (currentTeacherCount >= classCount + 1) {
            setError(
              `Teacher quota reached. You have ${currentTeacherCount} teachers and ${classCount} classes. ` +
              `Please create a class first and assign it a teacher before adding more teachers.`
            );
            setSaving(false);
            return;
          }
        } else if (formData.role === 'admin') {
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
      }

      // Create user
      const userData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        isActive: formData.isActive,
        tenantId: user.tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'users'), userData);

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
        entityId: docRef.id,
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

      alert('User created successfully!');
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
        <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
        <p className="text-gray-600 mt-1">Add a new user to your school system</p>
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

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  User Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a role...</option>
                  <option value="admin">Admin - Full system access</option>
                  <option value="teacher">Teacher - Manage classes and scores</option>
                  <option value="parent">Parent - View student results</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                )}
              </div>

              {/* Role Descriptions */}
              {formData.role && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    {formData.role === 'admin' && 'Admin Role'}
                    {formData.role === 'teacher' && 'Teacher Role'}
                    {formData.role === 'parent' && 'Parent Role'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {formData.role === 'admin' &&
                      'Can manage all aspects of the system including users, students, classes, scores, and reports.'}
                    {formData.role === 'teacher' &&
                      'Can manage assigned classes, enter and publish scores, view student records, and generate reports for their classes.'}
                    {formData.role === 'parent' &&
                      'Can view their children\'s results, scores, attendance, and download report cards.'}
                  </p>
                </div>
              )}

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
