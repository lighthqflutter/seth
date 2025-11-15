'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StudentData {
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth: { toDate: () => Date };
  gender: 'male' | 'female';
  currentClassId: string;
  address?: string;
  isActive: boolean;
  admissionDate: { toDate: () => Date };
  guardianIds: string[];
  photoUrl?: string;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const studentId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setStudent(studentDoc.data() as StudentData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading student:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    if (studentId) loadStudent();
  }, [studentId]);

  const calculateAge = (dateOfBirth: { toDate: () => Date }) => {
    const today = new Date();
    const birthDate = dateOfBirth.toDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleToggleActive = async () => {
    if (!student) return;

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'students', studentId), {
        isActive: !student.isActive,
        updatedAt: new Date(),
      });

      setStudent({ ...student, isActive: !student.isActive });
    } catch (error) {
      console.error('Error updating student status:', error);
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

  if (notFound || !student) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Student Not Found</h3>
            <p className="text-gray-600 mb-4">The student you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/dashboard/students')}>Back to Students</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.replace(/\s+/g, ' ').trim();
  const age = calculateAge(student.dateOfBirth);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/students')}>
            ← Back
          </Button>
        </div>
        <div className="flex gap-2">
          {user?.role === 'admin' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={updating}
              >
                {updating ? 'Updating...' : student.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" onClick={() => router.push(`/dashboard/students/${studentId}/edit`)}>
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Student Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-2xl">
                {student.firstName[0]}
                {student.lastName[0]}
              </div>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    student.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Admission Number:</span>
                  <span className="ml-2 font-medium text-gray-900">{student.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Gender:</span>
                  <span className="ml-2 font-medium text-gray-900 capitalize">{student.gender}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="ml-2 font-medium text-gray-900">{formatDate(student.dateOfBirth)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Age:</span>
                  <span className="ml-2 font-medium text-gray-900">{age} years old</span>
                </div>
                <div>
                  <span className="text-gray-600">Admission Date:</span>
                  <span className="ml-2 font-medium text-gray-900">{formatDate(student.admissionDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {student.address && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Address:</span>
                <p className="text-gray-900">{student.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Information */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Current Class:</span>
              <p className="text-gray-900">Class ID: {student.currentClassId}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Guardians:</span>
              <p className="text-gray-900">
                {student.guardianIds.length > 0
                  ? `${student.guardianIds.length} guardian(s) linked`
                  : 'No guardians linked'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder Sections */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Scores</h2>
          <p className="text-gray-600 text-sm">Score information will be displayed here once implemented.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h2>
          <p className="text-gray-600 text-sm">Attendance records will be displayed here once implemented.</p>
        </CardContent>
      </Card>
    </div>
  );
}
