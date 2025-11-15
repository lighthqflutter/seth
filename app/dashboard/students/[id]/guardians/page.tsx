'use client';

/**
 * Guardian Management Page (Phase 16)
 * Admins/Teachers can link/unlink guardians (parents) to students
 *
 * Features:
 * - View current guardians for a student
 * - Add parent users as guardians
 * - Remove guardian access
 * - Audit logging for all changes
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logAudit } from '@/lib/auditLogger';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  XMarkIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  guardianIds: string[];
}

interface ParentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function StudentGuardiansPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<ParentUser[]>([]);
  const [availableParents, setAvailableParents] = useState<ParentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !studentId) return;

      try {
        // Load student
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setLoading(false);
          return;
        }

        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        setStudent(studentData);

        // Load all parent users in the tenant
        const parentsQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'parent')
        );

        const parentsSnapshot = await getDocs(parentsQuery);
        const parentsData = parentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ParentUser[];

        // Separate current guardians from available parents
        const currentGuardians = parentsData.filter(p =>
          studentData.guardianIds && studentData.guardianIds.includes(p.id)
        );
        const available = parentsData.filter(p =>
          !studentData.guardianIds || !studentData.guardianIds.includes(p.id)
        );

        setGuardians(currentGuardians);
        setAvailableParents(available);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, studentId]);

  const handleAddGuardian = async (parentId: string) => {
    if (!user || !student) return;

    const parent = availableParents.find(p => p.id === parentId);
    if (!parent) return;

    const confirmed = confirm(
      `Add ${parent.name} as a guardian for ${student.firstName} ${student.lastName}?`
    );
    if (!confirmed) return;

    setUpdating(true);

    try {
      const updatedGuardianIds = [...(student.guardianIds || []), parentId];

      await updateDoc(doc(db, 'students', studentId), {
        guardianIds: updatedGuardianIds,
        updatedAt: new Date(),
      });

      // Audit log
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'update',
        entityType: 'student',
        entityId: studentId,
        entityName: `${student.firstName} ${student.lastName}`,
        before: { guardianIds: student.guardianIds },
        after: { guardianIds: updatedGuardianIds },
        metadata: {
          action: 'add_guardian',
          guardianId: parentId,
          guardianName: parent.name,
        },
      });

      // Update local state
      setGuardians([...guardians, parent]);
      setAvailableParents(availableParents.filter(p => p.id !== parentId));
      setStudent({ ...student, guardianIds: updatedGuardianIds });

      alert('Guardian added successfully!');
    } catch (error: any) {
      console.error('Error adding guardian:', error);

      // Audit log failure
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          success: false,
          errorMessage: error.message || 'Failed to add guardian',
        });
      }

      alert('Failed to add guardian. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveGuardian = async (parentId: string) => {
    if (!user || !student) return;

    const parent = guardians.find(g => g.id === parentId);
    if (!parent) return;

    const confirmed = confirm(
      `Remove ${parent.name} as a guardian for ${student.firstName} ${student.lastName}? They will no longer be able to view this student's results.`
    );
    if (!confirmed) return;

    setUpdating(true);

    try {
      const updatedGuardianIds = (student.guardianIds || []).filter(id => id !== parentId);

      await updateDoc(doc(db, 'students', studentId), {
        guardianIds: updatedGuardianIds,
        updatedAt: new Date(),
      });

      // Audit log
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'update',
        entityType: 'student',
        entityId: studentId,
        entityName: `${student.firstName} ${student.lastName}`,
        before: { guardianIds: student.guardianIds },
        after: { guardianIds: updatedGuardianIds },
        metadata: {
          action: 'remove_guardian',
          guardianId: parentId,
          guardianName: parent.name,
        },
      });

      // Update local state
      setGuardians(guardians.filter(g => g.id !== parentId));
      setAvailableParents([...availableParents, parent].sort((a, b) => a.name.localeCompare(b.name)));
      setStudent({ ...student, guardianIds: updatedGuardianIds });

      alert('Guardian removed successfully!');
    } catch (error: any) {
      console.error('Error removing guardian:', error);

      // Audit log failure
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: 'update',
          entityType: 'student',
          entityId: studentId,
          success: false,
          errorMessage: error.message || 'Failed to remove guardian',
        });
      }

      alert('Failed to remove guardian. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Student not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/students')}
          >
            Back to Students
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/students/${studentId}`)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Student
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Manage Guardians - {student.firstName} {student.lastName}
        </h1>
        <p className="text-gray-600 mt-1">{student.admissionNumber}</p>
      </div>

      {/* Current Guardians */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Guardians</h2>
          {guardians.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No guardians assigned</p>
              <p className="text-sm text-gray-500 mt-1">
                Add parent users below to give them access to view this student's results
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{guardian.name}</p>
                      <p className="text-sm text-gray-500">{guardian.email}</p>
                      {guardian.phone && (
                        <p className="text-sm text-gray-500">{guardian.phone}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveGuardian(guardian.id)}
                    disabled={updating}
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Parents */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Guardian</h2>
          {availableParents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No parent users available to add</p>
              <p className="text-sm text-gray-500 mt-1">
                All parent users are already assigned as guardians, or no parent users exist
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableParents.map((parent) => (
                <div
                  key={parent.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <UserIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{parent.name}</p>
                      <p className="text-sm text-gray-500">{parent.email}</p>
                      {parent.phone && (
                        <p className="text-sm text-gray-500">{parent.phone}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddGuardian(parent.id)}
                    disabled={updating}
                  >
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
