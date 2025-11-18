'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserIcon } from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber: string;
  currentClass: string;
  currentClassId: string;
  gender: 'male' | 'female';
  dateOfBirth: {
    toDate: () => Date;
  };
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  photoUrl?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [classFilter, setClassFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Load classes
  useEffect(() => {
    if (!user?.tenantId) return;

    const loadClasses = async () => {
      try {
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          orderBy('name')
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        })) as ClassOption[];
        setClasses(classesData);
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    };

    loadClasses();
  }, [user?.tenantId]);

  // Load students
  useEffect(() => {
    if (!user?.tenantId) return;

    const studentsQuery = query(
      collection(db, 'students'),
      where('tenantId', '==', user.tenantId),
      orderBy('admissionNumber')
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const studentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];

        setStudents(studentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading students:', error);
        setStudents([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.tenantId]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...students];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((student) => {
        const fullName = `${student.firstName} ${student.middleName || ''} ${student.lastName}`.toLowerCase();
        const admissionNumber = student.admissionNumber.toLowerCase();
        return fullName.includes(query) || admissionNumber.includes(query);
      });
    }

    // Apply class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(student => student.currentClassId === classFilter);
    }

    // Apply gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(student => student.gender === genderFilter);
    }

    // Apply alphabetical sorting
    filtered.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();

      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    setFilteredStudents(filtered);
  }, [searchQuery, students, classFilter, genderFilter, sortOrder]);

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
          <div className="space-y-4">
            {/* Search */}
            <div>
              <Input
                placeholder="Search students by name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Class Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By Name
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">A-Z (Ascending)</option>
                  <option value="desc">Z-A (Descending)</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setClassFilter('all');
                    setGenderFilter('all');
                    setSortOrder('asc');
                    setSearchQuery('');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
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
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={`${student.firstName} ${student.lastName}`}
                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200">
                        <UserIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
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
                        <span className="font-medium">Gender:</span> {student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}
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
