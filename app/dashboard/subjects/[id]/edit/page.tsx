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
  code: string;
  maxScore: string;
  description: string;
  classIds: string[];
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

export default function EditSubjectPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const subjectId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    maxScore: '',
    description: '',
    classIds: []
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.tenantId) return;

      try {
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          orderBy('name')
        );
        const snapshot = await getDocs(classesQuery);
        const classOptions = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          level: doc.data().level,
        }));
        setClasses(classOptions);
      } catch (error) {
        console.error('Error loading classes:', error);
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [user?.tenantId]);

  useEffect(() => {
    const loadSubject = async () => {
      try {
        const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
        if (!subjectDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = subjectDoc.data();
        setFormData({
          name: data.name || '',
          code: data.code || '',
          maxScore: data.maxScore?.toString() || '',
          description: data.description || '',
          classIds: data.classIds || [],
        });
        setLoading(false);
      } catch (error) {
        setNotFound(true);
        setLoading(false);
      }
    };
    if (subjectId) loadSubject();
  }, [subjectId]);

  const validateForm = (): boolean => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Subject name is required';
    if (!formData.code.trim()) {
      newErrors.code = 'Subject code is required';
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase letters and numbers only';
    }
    if (!formData.maxScore.trim()) {
      newErrors.maxScore = 'Max score is required';
    } else if (isNaN(parseInt(formData.maxScore)) || parseInt(formData.maxScore) <= 0) {
      newErrors.maxScore = 'Max score must be a positive number';
    }
    if (formData.classIds.length === 0) {
      newErrors.classIds = 'Please select at least one class';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClassToggle = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!validateForm()) return;
    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        maxScore: parseInt(formData.maxScore, 10),
        classIds: formData.classIds,
        updatedAt: new Date(),
      };

      // Only add description if provided
      if (formData.description.trim()) {
        updateData.description = formData.description.trim();
      }

      await updateDoc(doc(db, 'subjects', subjectId), updateData);
      router.push('/dashboard/subjects');
    } catch (error) {
      setSaveError('Failed to update subject. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (notFound) return <div className="max-w-2xl mx-auto"><Card><CardContent className="py-12 text-center"><h3 className="text-lg font-semibold mb-2">Subject Not Found</h3><Button onClick={() => router.push('/dashboard/subjects')}>Back to Subjects</Button></CardContent></Card></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Subject</h1>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mathematics"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Subject Code *
            </label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., MATH"
              className={errors.code ? 'border-red-500' : ''}
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>

          <div>
            <label htmlFor="maxScore" className="block text-sm font-medium text-gray-700 mb-2">
              Max Score *
            </label>
            <Input
              id="maxScore"
              type="number"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
              placeholder="e.g., 100"
              className={errors.maxScore ? 'border-red-500' : ''}
            />
            {errors.maxScore && <p className="mt-1 text-sm text-red-600">{errors.maxScore}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>

          {/* Classes Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes Taking This Subject *
            </label>
            {loadingClasses ? (
              <div className="text-sm text-gray-500">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-300">
                <p>No classes available. Create a class first.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/dashboard/classes/new')}
                >
                  Add Class
                </Button>
              </div>
            ) : (
              <div className={`border rounded-lg p-4 space-y-2 ${errors.classIds ? 'border-red-500' : 'border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={formData.classIds.length === classes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, classIds: classes.map(c => c.id) });
                      } else {
                        setFormData({ ...formData, classIds: [] });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                    Select All Classes
                  </label>
                </div>
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`class-${cls.id}`}
                      checked={formData.classIds.includes(cls.id)}
                      onChange={() => handleClassToggle(cls.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`class-${cls.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                      {cls.name} ({cls.level})
                    </label>
                  </div>
                ))}
                {formData.classIds.length > 0 && (
                  <div className="mt-3 pt-2 border-t text-sm text-gray-600">
                    {formData.classIds.length} {formData.classIds.length === 1 ? 'class' : 'classes'} selected
                  </div>
                )}
              </div>
            )}
            {errors.classIds && <p className="mt-1 text-sm text-red-600">{errors.classIds}</p>}
          </div>

          {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{saveError}</p></div>}
          <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => router.push('/dashboard/subjects')}>Cancel</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
