'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Check if user is super admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login?redirect=/dashboard/superadmin');
      } else if (user.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
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
  if (!user || user.role !== 'superadmin') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              🔒 Super Admin Portal
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage schools and platform settings</p>
          </div>
          <Link href="/register">
            <Button className="bg-purple-600 hover:bg-purple-700">
              + Add New School
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Schools</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Students</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Teachers</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Platform Revenue</CardDescription>
              <CardTitle className="text-3xl">₦0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Schools Management */}
          <Link href="/dashboard/superadmin/schools">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-100 hover:border-purple-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Schools</CardTitle>
                    <CardDescription>Manage all schools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View, create, edit, and manage school accounts, quotas, and settings
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Users Overview */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Platform users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                View all users across all schools (Coming Soon)
              </p>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Platform insights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                View platform-wide analytics and reports (Coming Soon)
              </p>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="border-2 border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Platform configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Configure platform-wide settings and preferences (Coming Soon)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Back to Regular Dashboard */}
        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Regular Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
