'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tenant } from '@/types';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  qualifications: string;
  subjectIds: string[];
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function NewTeacherPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    qualifications: '',
    subjectIds: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{name: string, subdomain: string} | null>(null);

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Load school information and subjects
  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load school info
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (tenantDoc.exists()) {
          const tenant = tenantDoc.data() as Tenant;
          setSchoolInfo({
            name: tenant.name,
            subdomain: tenant.subdomain,
          });
        }

        // Load subjects
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('tenantId', '==', user.tenantId)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          code: doc.data().code,
        })) as Subject[];
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG or JPG)');
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Photo file size must be less than 2MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    setPhotoFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Teacher name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      if (!user) {
        setSaveError('User not authenticated');
        setSaving(false);
        return;
      }

      // Check teacher quota before creating
      // Get tenant document
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (!tenantDoc.exists()) {
        setSaveError('School information not found');
        setSaving(false);
        return;
      }

      // Count existing teachers
      const teachersQuery = query(
        collection(db, 'users'),
        where('tenantId', '==', user.tenantId),
        where('role', '==', 'teacher')
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      const currentTeacherCount = teachersSnapshot.size;

      // Count classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('tenantId', '==', user.tenantId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classCount = classesSnapshot.size;

      // Teachers can only be 1 ahead of classes
      if (currentTeacherCount >= classCount + 1) {
        setSaveError(
          `Teacher quota reached. You have ${currentTeacherCount} teachers and ${classCount} classes. ` +
          `Please create a class first and assign it a teacher before adding more teachers.`
        );
        setSaving(false);
        return;
      }

      if (!schoolInfo) {
        setSaveError('School information not loaded');
        setSaving(false);
        return;
      }

      // Call API to create user and send invitation
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: 'teacher',
          tenantId: user.tenantId,
          schoolName: schoolInfo.name,
          schoolUrl: `https://${schoolInfo.subdomain}.seth.ng`,
          sendInvitation: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create teacher');
      }

      const teacherId = data.user.uid;

      // Upload photo if selected
      let photoUrl: string | undefined;
      if (photoFile) {
        setUploading(true);
        try {
          const fileExtension = photoFile.name.split('.').pop();
          const fileName = `teachers/${user.tenantId}/${teacherId}/photo.${fileExtension}`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, photoFile);
          photoUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          // Don't fail the whole operation if photo upload fails
        } finally {
          setUploading(false);
        }
      }

      // Update teacher document with additional fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (formData.bio.trim()) {
        updateData.bio = formData.bio.trim();
      }

      if (formData.qualifications.trim()) {
        updateData.qualifications = formData.qualifications.trim();
      }

      if (formData.subjectIds.length > 0) {
        updateData.subjectIds = formData.subjectIds;
      }

      if (photoUrl) {
        updateData.photoUrl = photoUrl;
      }

      await updateDoc(doc(db, 'users', teacherId), updateData);

      alert(`Teacher created successfully! Invitation email sent to ${formData.email}`);
      router.push('/dashboard/teachers');
    } catch (error) {
      console.error('Error creating teacher:', error);
      setSaveError('Failed to create teacher. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Teacher</h1>
        <p className="text-gray-600 mt-1">Create a new teacher account</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Teachers should be created first before creating their classes so they can be assigned during class creation.
                You can only have 1 more teacher than the number of classes you've created.
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., teacher@school.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone (Optional)
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +234 801 234 5678"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Photo (Optional)
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Teacher photo preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-gray-200">
                    <span className="text-3xl">👨‍🏫</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: JPG, PNG (max 2MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Biography (Optional)
              </label>
              <textarea
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief biography about the teacher..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Qualifications */}
            <div>
              <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-2">
                Qualifications (Optional)
              </label>
              <Input
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="e.g., B.Ed., M.Sc. Mathematics"
              />
            </div>

            {/* Subjects */}
            {subjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Subjects Taught (Optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.subjectIds.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {subject.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select all subjects this teacher will teach
                </p>
              </div>
            )}

            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/teachers')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
