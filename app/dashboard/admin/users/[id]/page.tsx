'use client';

/**
 * User Detail Page (Phase 14)
 * Super Admin feature for viewing detailed user information and activity
 *
 * Features:
 * - User profile information
 * - Quick role change
 * - Activate/Deactivate user
 * - Integration with activity dashboard (Phase 13)
 * - Edit user details
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logAudit } from '@/lib/auditLogger';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent';
  phone?: string;
  photoUrl?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: {
    toDate: () => Date;
  };
  updatedAt: {
    toDate: () => Date;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = params.id as string;

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load user details
  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (!userDoc.exists()) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setUserDetail({
          id: userDoc.id,
          ...userDoc.data(),
        } as UserDetail);
      } catch (err) {
        console.error('Error loading user:', err);
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  const handleRoleChange = async (newRole: string) => {
    if (!user || !userDetail || userDetail.role === newRole) return;

    const confirmed = confirm(
      `Are you sure you want to change this user's role from ${userDetail.role} to ${newRole}?`
    );
    if (!confirmed) return;

    setUpdating(true);

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      });

      // Audit log: Role changed
      await logAudit({
        user: {
          uid: user.uid,
          name: user.displayName || user.email || 'Unknown',
          email: user.email || '',
          role: userDetail.role, // Use userDetail for role and tenantId
          tenantId: userDetail.tenantId,
        },
        action: 'change_role',
        entityType: 'user',
        entityId: userId,
        entityName: userDetail.name,
        before: { role: userDetail.role },
        after: { role: newRole },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      // Update local state
      setUserDetail({ ...userDetail, role: newRole as any });
      alert('Role updated successfully!');
    } catch (error: any) {
      console.error('Error changing role:', error);

      // Audit log: Failed role change
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.displayName || user.email || 'Unknown',
            email: user.email || '',
            role: userDetail.role,
            tenantId: userDetail.tenantId,
          },
          action: 'change_role',
          entityType: 'user',
          entityId: userId,
          success: false,
          errorMessage: error.message || 'Failed to change role',
        });
      }

      alert('Failed to change role. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user || !userDetail) return;

    const action = userDetail.isActive ? 'deactivate' : 'activate';
    const confirmed = confirm(
      `Are you sure you want to ${action} this user?`
    );
    if (!confirmed) return;

    setUpdating(true);

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !userDetail.isActive,
        updatedAt: new Date(),
      });

      // Audit log: User status changed
      await logAudit({
        user: {
          uid: user.uid,
          name: user.displayName || user.email || 'Unknown',
          email: user.email || '',
          role: userDetail.role,
          tenantId: userDetail.tenantId,
        },
        action: userDetail.isActive ? 'deactivate_user' : 'activate_user',
        entityType: 'user',
        entityId: userId,
        entityName: userDetail.name,
        before: { isActive: userDetail.isActive },
        after: { isActive: !userDetail.isActive },
      });

      // Update local state
      setUserDetail({ ...userDetail, isActive: !userDetail.isActive });
      alert(`User ${action}d successfully!`);
    } catch (error: any) {
      console.error('Error toggling status:', error);

      // Audit log: Failed status change
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.displayName || user.email || 'Unknown',
            email: user.email || '',
            role: userDetail.role,
            tenantId: userDetail.tenantId,
          },
          action: userDetail.isActive ? 'deactivate_user' : 'activate_user',
          entityType: 'user',
          entityId: userId,
          success: false,
          errorMessage: error.message || 'Failed to toggle status',
        });
      }

      alert('Failed to update user status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'parent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error || 'User not found'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/admin/users')}
          >
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{userDetail.name}</h1>
            <p className="text-gray-600 mt-1">{userDetail.email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/users/${userId}/activity`)}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Activity
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - User Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>

              <div className="flex items-start">
                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">{userDetail.name}</p>
                </div>
              </div>

              <div className="flex items-start">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium text-gray-900">{userDetail.email}</p>
                </div>
              </div>

              {userDetail.phone && (
                <div className="flex items-start">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{userDetail.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {userDetail.createdAt.toDate().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {userDetail.updatedAt.toDate().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Role & Status Management */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Role & Status Management</h2>

              {/* Role Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <select
                  value={userDetail.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={updating || userId === user?.uid}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    userId === user?.uid ? 'cursor-not-allowed bg-gray-100' : ''
                  }`}
                >
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
                {userId === user?.uid && (
                  <p className="mt-1 text-xs text-gray-500">
                    You cannot change your own role
                  </p>
                )}
              </div>

              {/* Current Role Badge */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Current Role</p>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadgeColor(userDetail.role)}`}>
                  {userDetail.role.charAt(0).toUpperCase() + userDetail.role.slice(1)}
                </span>
              </div>

              {/* Status Badge */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                {userDetail.isActive ? (
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </div>

              {/* Status Toggle Button */}
              <div>
                <Button
                  variant="outline"
                  onClick={handleToggleStatus}
                  disabled={updating || userId === user?.uid}
                  className="w-full"
                >
                  {userDetail.isActive ? (
                    <>
                      <XCircleIcon className="h-5 w-5 mr-2" />
                      Deactivate User
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Activate User
                    </>
                  )}
                </Button>
                {userId === user?.uid && (
                  <p className="mt-1 text-xs text-gray-500">
                    You cannot deactivate yourself
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/users/${userId}/activity`)}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Full Activity Log
            </Button>
            {/* Future: Add edit user details button */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
