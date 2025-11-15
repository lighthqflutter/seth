'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface FormData {
  name: string;
  level: string;
  academicYear: string;
  teacherId: string;
}

interface FormErrors {
  name?: string;
  level?: string;
  academicYear?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const classId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    level: '',
    academicYear: '',
    teacherId: '',
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load class data
        const classDoc = await getDoc(doc(db, 'classes', classId));

        if (!classDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = classDoc.data();
        setFormData({
          name: data.name || '',
          level: data.level || '',
          academicYear: data.academicYear || '',
          teacherId: data.teacherId || '',
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading class:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    if (classId) {
      loadData();
    }
  }, [classId]);

  useEffect(() => {
    const loadTeachers = async () => {
      if (!user?.tenantId) return;

      try {
        const teachersQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'teacher'),
          where('isActive', '==', true),
          orderBy('name')
        );

        const snapshot = await getDocs(teachersQuery);
        const teachersData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
        })) as Teacher[];

        setTeachers(teachersData);
        setLoadingTeachers(false);
      } catch (error) {
        console.error('Error loading teachers:', error);
        setLoadingTeachers(false);
      }
    };

    loadTeachers();
  }, [user?.tenantId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.level.trim()) {
      newErrors.level = 'Level is required';
    }

    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    } else {
      const academicYearRegex = /^\d{4}\/\d{4}$/;
      if (!academicYearRegex.test(formData.academicYear)) {
        newErrors.academicYear = 'Academic year must be in format YYYY/YYYY (e.g., 2024/2025)';
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
      const updateData: any = {
        name: formData.name.trim(),
        level: formData.level.trim(),
        academicYear: formData.academicYear.trim(),
        updatedAt: new Date(),
      };

      // Only add teacherId if one is selected
      if (formData.teacherId) {
        updateData.teacherId = formData.teacherId;
      } else {
        // Remove teacherId if cleared
        updateData.teacherId = null;
      }

      await updateDoc(doc(db, 'classes', classId), updateData);
      router.push('/dashboard/classes');
    } catch (error) {
      console.error('Error updating class:', error);
      setSaveError('Failed to update class. Please try again.');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/classes');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Class Not Found</h3>
              <p className="text-gray-600 mb-6">The class you're looking for doesn't exist.</p>
              <Button onClick={() => router.push('/dashboard/classes')}>
                Back to Classes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
        <p className="text-gray-600 mt-1">Update class information</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Class Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Class Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., JSS 1A"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Level */}
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <Input
                id="level"
                type="text"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="e.g., JSS1, SS2"
                className={errors.level ? 'border-red-500' : ''}
              />
              {errors.level && (
                <p className="mt-1 text-sm text-red-600">{errors.level}</p>
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year *
              </label>
              <Input
                id="academicYear"
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g., 2024/2025"
                className={errors.academicYear ? 'border-red-500' : ''}
              />
              {errors.academicYear && (
                <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>
              )}
            </div>

            {/* Class Teacher (Optional) */}
            <div>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-2">
                Class Teacher (Optional)
              </label>
              {loadingTeachers ? (
                <div className="text-sm text-gray-500">Loading teachers...</div>
              ) : teachers.length === 0 ? (
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p>No teachers available. Create a teacher first.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/dashboard/teachers/new')}
                  >
                    Add Teacher
                  </Button>
                </div>
              ) : (
                <select
                  id="teacherId"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No teacher assigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
