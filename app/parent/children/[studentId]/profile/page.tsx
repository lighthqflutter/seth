'use client';

/**
 * Child Profile Page for Parents
 * Parents can view their child's profile information, class details, and guardians
 *
 * Features:
 * - Student personal information
 * - Current class and level
 * - Attendance summary
 * - Guardian information
 * - Contact details
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeftIcon,
  UserIcon,
  AcademicCapIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  dateOfBirth: any;
  gender: string;
  photoUrl?: string;
  guardianIds: string[];
  address?: string;
  bloodGroup?: string;
  medicalNotes?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
  teacherId?: string;
  teacherName?: string;
}

interface Guardian {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone2?: string;
  relationshipType: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

export default function ChildProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !user?.uid || !studentId) return;

      // Redirect non-parents to their appropriate dashboard
      if (user.role !== 'parent') {
        if (user.role === 'admin' || user.role === 'teacher' || user.role === 'finance') {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
        return;
      }

      try {
        // Load student and verify parent access
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setError('Student not found');
          setLoading(false);
          return;
        }

        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;

        // Verify this parent has access to this child
        if (!studentData.guardianIds || !studentData.guardianIds.includes(user.uid)) {
          setError('You do not have access to view this student');
          setLoading(false);
          return;
        }

        setStudent(studentData);

        // Load class info
        const classDoc = await getDoc(doc(db, 'classes', studentData.currentClassId));
        if (classDoc.exists()) {
          const classData = { id: classDoc.id, ...classDoc.data() } as ClassInfo;

          // Load teacher name if available
          if (classData.teacherId) {
            const teacherDoc = await getDoc(doc(db, 'users', classData.teacherId));
            if (teacherDoc.exists()) {
              classData.teacherName = teacherDoc.data().name;
            }
          }

          setClassInfo(classData);
        }

        // Load guardians
        if (studentData.guardianIds && studentData.guardianIds.length > 0) {
          const guardiansQuery = query(
            collection(db, 'users'),
            where('tenantId', '==', user.tenantId),
            where('role', '==', 'parent')
          );

          const guardiansSnapshot = await getDocs(guardiansQuery);
          const guardiansData = guardiansSnapshot.docs
            .filter(doc => studentData.guardianIds.includes(doc.id))
            .map(doc => ({
              id: doc.id,
              name: doc.data().name,
              email: doc.data().email,
              phone: doc.data().phone || '',
              phone2: doc.data().phone2,
              relationshipType: doc.data().relationshipType || 'other',
              isPrimary: doc.data().isPrimary || false,
              isEmergencyContact: doc.data().isEmergencyContact || false,
            })) as Guardian[];

          setGuardians(guardiansData);
        }

        // Load attendance summary (basic calculation)
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('studentId', '==', studentId)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        if (!attendanceSnapshot.empty) {
          const totalDays = attendanceSnapshot.size;
          const presentDays = attendanceSnapshot.docs.filter(
            doc => doc.data().status === 'present'
          ).length;
          const absentDays = attendanceSnapshot.docs.filter(
            doc => doc.data().status === 'absent'
          ).length;
          const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

          setAttendance({
            totalDays,
            presentDays,
            absentDays,
            attendanceRate,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading child profile:', err);
        setError('Failed to load child profile');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, user?.uid, user?.role, studentId, router]);

  const formatDate = (date: any) => {
    if (!date) return 'Not specified';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      father: 'Father',
      mother: 'Mother',
      legal_guardian: 'Legal Guardian',
      other: 'Guardian',
    };
    return labels[type] || 'Guardian';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error || 'Student not found'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/parent/dashboard')}
          >
            Back to Dashboard
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
          onClick={() => router.push('/parent/dashboard')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-gray-600 mt-1">{student.admissionNumber}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/parent/children/${studentId}`)}
          >
            View Results
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Full Name</p>
              <p className="text-sm font-medium text-gray-900">
                {student.firstName} {student.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Admission Number</p>
              <p className="text-sm font-medium text-gray-900">{student.admissionNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{student.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(student.dateOfBirth)}</p>
            </div>
            {student.bloodGroup && (
              <div>
                <p className="text-sm text-gray-600">Blood Group</p>
                <p className="text-sm font-medium text-gray-900">{student.bloodGroup}</p>
              </div>
            )}
            {student.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-sm font-medium text-gray-900">{student.address}</p>
              </div>
            )}
          </div>
          {student.medicalNotes && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm font-medium text-orange-900 mb-1">Medical Notes</p>
              <p className="text-sm text-orange-800">{student.medicalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Information */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AcademicCapIcon className="h-5 w-5 mr-2 text-purple-500" />
            Class Information
          </h2>
          {classInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Current Class</p>
                <p className="text-sm font-medium text-gray-900">{classInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-sm font-medium text-gray-900">{classInfo.level}</p>
              </div>
              {classInfo.teacherName && (
                <div>
                  <p className="text-sm text-gray-600">Class Teacher</p>
                  <p className="text-sm font-medium text-gray-900">{classInfo.teacherName}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Class information not available</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {attendance && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-green-500" />
              Attendance Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Days</p>
                <p className="text-2xl font-bold text-gray-900">{attendance.totalDays}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendance.presentDays}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendance.absentDays}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {attendance.attendanceRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guardians */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guardians / Parents</h2>
          {guardians.length === 0 ? (
            <p className="text-sm text-gray-600">No guardian information available</p>
          ) : (
            <div className="space-y-4">
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {guardian.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getRelationshipLabel(guardian.relationshipType)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {guardian.isPrimary && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Primary
                        </span>
                      )}
                      {guardian.isEmergencyContact && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          Emergency
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      {guardian.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      {guardian.phone}
                    </div>
                    {guardian.phone2 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {guardian.phone2}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
