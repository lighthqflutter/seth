'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tenant } from '@/types';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function SchoolsListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState<(Tenant & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Check if user is super admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/dashboard/superadmin/schools');
      } else if (user.role !== 'superadmin') {
        router.push('/dashboard');
      } else {
        loadSchools();
      }
    }
  }, [user, authLoading, router]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      setError('');

      const schoolsQuery = query(
        collection(db, 'tenants'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(schoolsQuery);
      const schoolsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const tenantId = doc.id;
          const tenantData = doc.data() as Tenant;

          // Count students for this tenant
          const studentsQuery = query(
            collection(db, 'students'),
            where('tenantId', '==', tenantId)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentCount = studentsSnapshot.size;

          // Count users by role
          const usersQuery = query(
            collection(db, 'users'),
            where('tenantId', '==', tenantId)
          );
          const usersSnapshot = await getDocs(usersQuery);

          let teacherCount = 0;
          let adminCount = 0;

          usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.role === 'teacher') teacherCount++;
            if (userData.role === 'admin') adminCount++;
          });

          return {
            ...tenantData,
            id: tenantId,
            currentStudentCount: studentCount,
            currentTeacherCount: teacherCount,
            currentAdminCount: adminCount,
          };
        })
      );

      setSchools(schoolsData);
    } catch (err: any) {
      console.error('Error loading schools:', err);
      setError('Failed to load schools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link href="/dashboard/superadmin">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                🔒 Super Admin
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Schools Management</h1>
            <p className="text-gray-600 mt-1">View and manage all school accounts</p>
          </div>
          <Link href="/register">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New School
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by school name, email, or subdomain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Schools List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading schools...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No schools found' : 'No schools yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first school'}
              </p>
              {!searchTerm && (
                <Link href="/register">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add First School
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Schools Count */}
            <div className="text-sm text-gray-600">
              Showing {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'}
            </div>

            {/* Schools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchools.map((school) => (
                <Card key={school.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* School Header */}
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {school.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              school.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : school.status === 'trial'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {school.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {school.subdomain}.seth.ng
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {school.currentStudentCount || 0}/{school.maxStudents}
                            </div>
                            <div className="text-xs text-gray-500">Students</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AcademicCapIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {school.currentTeacherCount || 0}
                            </div>
                            <div className="text-xs text-gray-500">Teachers</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-4 w-4 text-purple-400" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {school.currentAdminCount || 0}/{school.maxAdmins}
                            </div>
                            <div className="text-xs text-gray-500">Admins</div>
                          </div>
                        </div>
                      </div>

                      {/* School Info */}
                      <div className="text-xs text-gray-600 space-y-1">
                        {school.email && (
                          <div className="truncate">📧 {school.email}</div>
                        )}
                        {school.phone && (
                          <div className="truncate">📞 {school.phone}</div>
                        )}
                      </div>

                      {/* Quotas */}
                      <div className="border-t pt-3 text-xs text-gray-600">
                        <div>Max Students: <strong>{school.maxStudents}</strong></div>
                        <div>Max Admins: <strong>{school.maxAdmins}</strong></div>
                        <div>Plan: <strong className="capitalize">{school.plan}</strong></div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`https://${school.subdomain}.seth.ng`, '_blank')}
                        >
                          Visit
                        </Button>
                        <Link href={`/dashboard/superadmin/schools/${school.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
