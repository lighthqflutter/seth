'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber: string;
  currentClass: string;
  dateOfBirth: {
    toDate: () => Date;
  };
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  photoURL?: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.tenantId) return;

    const studentsQuery = query(
      collection(db, 'students'),
      where('tenantId', '==', user.tenantId),
      orderBy('admissionNumber')
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];

      setStudents(studentsData);
      setFilteredStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.tenantId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter((student) => {
      const fullName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.toLowerCase();
      const admissionNumber = student.admissionNumber.toLowerCase();

      return fullName.includes(query) || admissionNumber.includes(query);
    });

    setFilteredStudents(filtered);
  }, [searchQuery, students]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => router.push('/dashboard/students/new')}>
            Add Student
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search students by name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No students found' : 'No students yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by adding your first student'}
              </p>
              {!searchQuery && user?.role === 'admin' && (
                <Button onClick={() => router.push('/dashboard/students/new')}>
                  Add Your First Student
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student.firstName} {student.middleName} {student.lastName}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                      <span>
                        <span className="font-medium">Admission No:</span> {student.admissionNumber}
                      </span>
                      <span>
                        <span className="font-medium">Class:</span> {student.currentClass}
                      </span>
                      <span>
                        <span className="font-medium">Age:</span> {calculateAge(student.dateOfBirth)} years
                      </span>
                      <span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {student.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/students/${student.id}`)}
                    >
                      View
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/students/${student.id}/edit`)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
