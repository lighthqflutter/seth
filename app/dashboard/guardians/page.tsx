'use client';

/**
 * Guardians Management Page (Phase 20)
 * List all guardians/parents with search, filter, and management capabilities
 *
 * Features:
 * - List all guardians with contact info
 * - Search by name, email, phone
 * - Filter by relationship type
 * - View linked students
 * - Add/edit/delete guardians
 * - Bulk operations
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Guardian {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone2?: string;
  address?: string;
  occupation?: string;
  relationshipType: 'father' | 'mother' | 'legal_guardian' | 'other';
  isPrimary: boolean;
  isEmergencyContact: boolean;
  contactPreferences: {
    email: boolean;
    sms: boolean;
    call: boolean;
  };
  linkedStudents: string[]; // Array of student IDs
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export default function GuardiansPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Map<string, Student>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRelationship, setFilterRelationship] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load all parent users
        const usersQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'parent'),
          orderBy('name')
        );

        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
          phone: doc.data().phone || '',
          phone2: doc.data().phone2,
          address: doc.data().address,
          occupation: doc.data().occupation,
          relationshipType: doc.data().relationshipType || 'other',
          isPrimary: doc.data().isPrimary || false,
          isEmergencyContact: doc.data().isEmergencyContact || false,
          contactPreferences: doc.data().contactPreferences || {
            email: true,
            sms: false,
            call: true,
          },
          linkedStudents: [],
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
          tenantId: doc.data().tenantId,
        })) as Guardian[];

        // Load all students to find links
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          admissionNumber: doc.data().admissionNumber,
          guardianIds: doc.data().guardianIds || [],
        }));

        // Create student map
        const studentMap = new Map<string, Student>();
        studentsData.forEach(student => {
          studentMap.set(student.id, {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
          });
        });
        setStudents(studentMap);

        // Link students to guardians
        const guardiansWithLinks = usersData.map(guardian => ({
          ...guardian,
          linkedStudents: studentsData
            .filter(s => s.guardianIds.includes(guardian.id))
            .map(s => s.id),
        }));

        setGuardians(guardiansWithLinks);
        setLoading(false);
      } catch (error) {
        console.error('Error loading guardians:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  // Filter guardians
  const filteredGuardians = guardians.filter(guardian => {
    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      guardian.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guardian.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guardian.phone.includes(searchTerm);

    // Relationship filter (case-insensitive comparison)
    const matchesRelationship =
      filterRelationship === 'all' ||
      guardian.relationshipType?.toLowerCase() === filterRelationship.toLowerCase();

    return matchesSearch && matchesRelationship;
  });

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      father: 'Father',
      mother: 'Mother',
      legal_guardian: 'Legal Guardian',
      other: 'Other',
    };
    return labels[type?.toLowerCase()] || 'Other';
  };

  const getRelationshipBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      father: 'bg-blue-100 text-blue-800',
      mother: 'bg-pink-100 text-pink-800',
      legal_guardian: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guardian Management</h1>
          <p className="text-gray-600 mt-1">Manage parents and guardians linked to students</p>
        </div>
        <Button onClick={() => router.push('/dashboard/guardians/new')}>
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Guardian
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Guardians</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{guardians.length}</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Fathers</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {guardians.filter(g => g.relationshipType?.toLowerCase() === 'father').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Mothers</p>
              <p className="text-2xl font-bold text-pink-600 mt-1">
                {guardians.filter(g => g.relationshipType?.toLowerCase() === 'mother').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Emergency Contacts</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {guardians.filter(g => g.isEmergencyContact).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterRelationship}
              onChange={(e) => setFilterRelationship(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Relationships</option>
              <option value="father">Fathers</option>
              <option value="mother">Mothers</option>
              <option value="legal_guardian">Legal Guardians</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Guardians List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredGuardians.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No guardians found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/dashboard/guardians/new')}
              >
                Add First Guardian
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGuardians.map(guardian => (
            <Card key={guardian.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {guardian.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{guardian.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRelationshipBadgeColor(guardian.relationshipType)}`}>
                            {getRelationshipLabel(guardian.relationshipType)}
                          </span>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {guardian.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {guardian.phone || 'No phone'}
                      </div>
                      {guardian.occupation && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Occupation:</span> {guardian.occupation}
                        </div>
                      )}
                    </div>

                    {guardian.linkedStudents.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Linked Students ({guardian.linkedStudents.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {guardian.linkedStudents.map(studentId => {
                            const student = students.get(studentId);
                            return student ? (
                              <span
                                key={studentId}
                                className="inline-flex px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                              >
                                {student.firstName} {student.lastName}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/guardians/${guardian.id}`)}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
