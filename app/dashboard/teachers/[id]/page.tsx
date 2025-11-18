'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeftIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface Teacher {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  qualifications?: string;
  subjectIds?: string[];
  isActive: boolean;
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedClass, setAssignedClass] = useState<ClassInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !teacherId) return;

      try {
        // Load teacher
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (!teacherDoc.exists()) {
          setError('Teacher not found');
          setLoading(false);
          return;
        }

        const teacherData = { id: teacherDoc.id, ...teacherDoc.data() } as Teacher;

        // Verify teacher belongs to same tenant
        if (teacherData.tenantId !== user.tenantId) {
          setError('Access denied');
          setLoading(false);
          return;
        }

        setTeacher(teacherData);

        // Load assigned class (where teacherId matches)
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('teacherId', '==', teacherId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        if (!classesSnapshot.empty) {
          const classData = classesSnapshot.docs[0];
          setAssignedClass({
            id: classData.id,
            name: classData.data().name,
            level: classData.data().level,
          });
        }

        // Load subjects if teacher has subjectIds
        if (teacherData.subjectIds && teacherData.subjectIds.length > 0) {
          const subjectsQuery = query(
            collection(db, 'subjects'),
            where('tenantId', '==', user.tenantId)
          );
          const subjectsSnapshot = await getDocs(subjectsQuery);
          const subjectsData = subjectsSnapshot.docs
            .filter(doc => teacherData.subjectIds!.includes(doc.id))
            .map(doc => ({
              id: doc.id,
              name: doc.data().name,
              code: doc.data().code,
            })) as Subject[];
          setSubjects(subjectsData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading teacher:', err);
        setError('Failed to load teacher profile');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, teacherId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
          {error || 'Teacher not found'}
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/teachers')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/teachers')}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Teachers
      </button>

      {/* Header with Photo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Photo */}
              <div className="flex-shrink-0">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={teacher.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                    <UserIcon className="h-12 w-12 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Name and Status */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    teacher.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {teacher.qualifications && (
                    <span className="text-sm text-gray-600">
                      {teacher.qualifications}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/teachers/${teacherId}/edit`)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {/* Bio */}
          {teacher.bio && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-700">{teacher.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{teacher.email}</p>
              </div>
            </div>
            {teacher.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{teacher.phone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Class */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AcademicCapIcon className="h-5 w-5" />
            Assigned Class
          </h2>
          {assignedClass ? (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-gray-900">{assignedClass.name}</p>
              <p className="text-sm text-gray-600 mt-1">Level: {assignedClass.level}</p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No class assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subjects Taught */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Subjects Taught
          </h2>
          {subjects.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900">{subject.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{subject.code}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No subjects assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
