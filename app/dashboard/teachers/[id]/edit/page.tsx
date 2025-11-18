'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';

interface FormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  qualifications: string;
  subjectIds: string[];
  gender: 'male' | 'female' | '';
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

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const teacherId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    qualifications: '',
    subjectIds: [],
    gender: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Photo upload state
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load teacher
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (!teacherDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = teacherDoc.data();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          qualifications: data.qualifications || '',
          subjectIds: data.subjectIds || [],
          gender: data.gender || '',
        });
        setCurrentPhotoUrl(data.photoUrl || '');

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

        setLoading(false);
      } catch (error) {
        console.error('Error loading teacher:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    if (teacherId) loadData();
  }, [teacherId, user?.tenantId]);

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

  const handleDeletePhoto = async () => {
    if (!currentPhotoUrl) return;

    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    setDeleting(true);
    try {
      // Delete from storage if it's a Firebase Storage URL
      if (currentPhotoUrl.includes('firebasestorage.googleapis.com')) {
        const photoRef = ref(storage, currentPhotoUrl);
        await deleteObject(photoRef);
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', teacherId), {
        photoUrl: null,
        updatedAt: new Date(),
      });

      setCurrentPhotoUrl('');
      alert('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    } finally {
      setDeleting(false);
    }
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
      if (!user?.tenantId) {
        setSaveError('User not authenticated');
        setSaving(false);
        return;
      }

      // Upload new photo if selected
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
          setSaveError('Failed to upload photo. Please try again.');
          setSaving(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // Update teacher document
      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        updatedAt: new Date(),
      };

      // Only include optional fields if they have values
      if (formData.phone.trim()) {
        updateData.phone = formData.phone.trim();
      }

      if (formData.bio.trim()) {
        updateData.bio = formData.bio.trim();
      }

      if (formData.qualifications.trim()) {
        updateData.qualifications = formData.qualifications.trim();
      }

      if (formData.subjectIds.length > 0) {
        updateData.subjectIds = formData.subjectIds;
      }

      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      if (photoUrl) {
        updateData.photoUrl = photoUrl;
      }

      await updateDoc(doc(db, 'users', teacherId), updateData);

      alert('Teacher updated successfully!');
      router.push('/dashboard/teachers');
    } catch (error) {
      console.error('Error updating teacher:', error);
      setSaveError('Failed to update teacher. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Teacher Not Found</h3>
            <Button onClick={() => router.push('/dashboard/teachers')}>Back to Teachers</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
        <p className="text-gray-600 mt-1">Update teacher information</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender (Optional)
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
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
                ) : currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt="Current teacher photo"
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || deleting}
                    >
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      {photoPreview || currentPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {currentPhotoUrl && !photoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeletePhoto}
                        disabled={uploading || deleting}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        {deleting ? 'Deleting...' : 'Delete Photo'}
                      </Button>
                    )}
                  </div>
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
              <Button type="submit" disabled={saving || uploading || deleting}>
                {saving ? 'Saving...' : 'Save Changes'}
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
