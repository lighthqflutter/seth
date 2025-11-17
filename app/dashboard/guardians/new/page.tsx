'use client';

/**
 * Add New Guardian Page (Phase 20)
 * Create a new guardian/parent with contact details and student linking
 *
 * Features:
 * - Full contact information form
 * - Relationship type selection
 * - Primary/emergency contact flags
 * - Multi-student linking with checkboxes
 * - Auto-link siblings suggestion
 * - Contact preferences
 * - Audit logging
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, getDoc, serverTimestamp, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/auditLogger';
import { Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  ArrowLeftIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: string;
  className?: string;
}

interface GuardianFormData {
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
}

export default function NewGuardianPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [suggestedSiblings, setSuggestedSiblings] = useState<Map<string, string[]>>(new Map());

  const [formData, setFormData] = useState<GuardianFormData>({
    name: '',
    email: '',
    phone: '',
    phone2: '',
    address: '',
    occupation: '',
    relationshipType: 'father',
    isPrimary: false,
    isEmergencyContact: false,
    contactPreferences: {
      email: true,
      sms: false,
      call: true,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.tenantId) return;

      try {
        // Load all active students
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
          classId: doc.data().classId,
        })) as Student[];

        // Load class names
        const classIds = [...new Set(studentsData.map(s => s.classId))];
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classMap = new Map(
          classesSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        const studentsWithClass = studentsData.map(student => ({
          ...student,
          className: classMap.get(student.classId),
        }));

        setStudents(studentsWithClass);
        setLoading(false);
      } catch (error) {
        console.error('Error loading students:', error);
        setLoading(false);
      }
    };

    loadStudents();
  }, [user?.tenantId]);

  // Auto-detect siblings when a student is selected
  useEffect(() => {
    if (selectedStudents.length === 0) return;

    const selected = students.filter(s => selectedStudents.includes(s.id));
    const lastNames = selected.map(s => s.lastName);

    const siblings = new Map<string, string[]>();
    selected.forEach(student => {
      const potentialSiblings = students
        .filter(s =>
          !selectedStudents.includes(s.id) &&
          s.lastName === student.lastName
        )
        .map(s => s.id);

      if (potentialSiblings.length > 0) {
        siblings.set(student.id, potentialSiblings);
      }
    });

    setSuggestedSiblings(siblings);
  }, [selectedStudents, students]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (selectedStudents.length === 0) {
      newErrors.students = 'Please select at least one student to link';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user?.tenantId) return;

    setSaving(true);

    try {
      // Get school information for invitation email
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (!tenantDoc.exists()) {
        setErrors({ submit: 'School information not found' });
        setSaving(false);
        return;
      }

      const tenant = tenantDoc.data() as Tenant;
      const schoolUrl = `https://${tenant.subdomain}.seth.ng`;

      // Create guardian user via API (creates Firebase Auth account + sends invitation)
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim(),
          role: 'parent',
          tenantId: user.tenantId,
          schoolName: tenant.name,
          schoolUrl: schoolUrl,
          sendInvitation: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create guardian');
      }

      const guardianId = data.user.uid;

      // Update user document with additional guardian fields
      await updateDoc(doc(db, 'users', guardianId), {
        phone2: formData.phone2 || null,
        address: formData.address || null,
        occupation: formData.occupation || null,
        relationshipType: formData.relationshipType,
        isPrimary: formData.isPrimary,
        isEmergencyContact: formData.isEmergencyContact,
        contactPreferences: formData.contactPreferences,
        updatedAt: new Date(),
      });

      // Update students' guardianIds arrays
      const batch = writeBatch(db);
      selectedStudents.forEach(studentId => {
        const studentRef = doc(db, 'students', studentId);
        const student: any = students.find(s => s.id === studentId);
        batch.update(studentRef, {
          guardianIds: [...(student?.guardianIds || []), guardianId],
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      // Log audit trail
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'create',
        entityType: 'guardian',
        entityId: guardianId,
        entityName: formData.name,
        after: formData,
        metadata: {
          linkedStudents: selectedStudents,
          guardianName: formData.name,
          guardianEmail: formData.email,
          studentCount: selectedStudents.length,
        },
      });

      alert(`Guardian created successfully! Invitation email sent to ${formData.email}`);

      // Redirect to guardians list
      router.push('/dashboard/guardians');
    } catch (error: any) {
      console.error('Error creating guardian:', error);
      setErrors({ submit: error.message || 'Failed to create guardian. Please try again.' });
      setSaving(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAddSuggestedSiblings = (studentId: string) => {
    const siblings = suggestedSiblings.get(studentId) || [];
    setSelectedStudents(prev => [...new Set([...prev, ...siblings])]);
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/guardians')}
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Guardians
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Guardian</h1>
          <p className="text-gray-600 mt-1">Create a new parent/guardian account and link to students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g. John Doe"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <EnvelopeIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john.doe@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Primary Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone *
                </label>
                <div className="relative">
                  <PhoneIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+234 800 000 0000"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Secondary Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Phone (Optional)
                </label>
                <div className="relative">
                  <PhoneIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <div className="relative">
                  <MapPinIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Home address"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation (Optional)
                </label>
                <div className="relative">
                  <BriefcaseIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Engineer, Doctor, Teacher"
                  />
                </div>
              </div>

              {/* Relationship Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship Type *
                </label>
                <select
                  value={formData.relationshipType}
                  onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="legal_guardian">Legal Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guardian Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Guardian Designation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Primary Guardian</div>
                <div className="text-sm text-gray-600">Main contact for the student(s)</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isEmergencyContact}
                onChange={(e) => setFormData({ ...formData, isEmergencyContact: e.target.checked })}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Emergency Contact</div>
                <div className="text-sm text-gray-600">Contact in case of emergencies</div>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Contact Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contactPreferences.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactPreferences: { ...formData.contactPreferences, email: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-900">Email notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contactPreferences.sms}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactPreferences: { ...formData.contactPreferences, sms: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-900">SMS notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contactPreferences.call}
                  onChange={(e) => setFormData({
                    ...formData,
                    contactPreferences: { ...formData.contactPreferences, call: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-900">Phone calls</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Link Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Link Students *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Select the student(s) this guardian is responsible for
            </p>

            {errors.students && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {errors.students}
              </div>
            )}

            {/* Siblings suggestion */}
            {suggestedSiblings.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Suggested Siblings Detected:</p>
                {Array.from(suggestedSiblings.entries()).map(([studentId, siblingIds]) => {
                  const student = students.find(s => s.id === studentId);
                  const siblings = students.filter(s => siblingIds.includes(s.id));
                  return (
                    <div key={studentId} className="text-sm text-blue-700">
                      Students with last name "{student?.lastName}": {siblings.map(s => s.firstName).join(', ')}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-3"
                        onClick={() => handleAddSuggestedSiblings(studentId)}
                      >
                        Add Siblings
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto space-y-2">
              {students.map(student => (
                <label
                  key={student.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedStudents.includes(student.id) ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {student.admissionNumber} • {student.className}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {selectedStudents.length} student(s) selected
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Creating Guardian...' : 'Create Guardian'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/guardians')}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
