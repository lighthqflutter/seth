'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
}

export default function EditSubjectPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', code: '', maxScore: '', description: '' });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!validateForm()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'subjects', subjectId), {
        name: formData.name.trim(),
        code: formData.code.trim(),
        maxScore: parseInt(formData.maxScore, 10),
        description: formData.description.trim() || undefined,
        updatedAt: new Date(),
      });
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
          <div><label htmlFor="name" className="block text-sm font-medium mb-2">Subject Name *</label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}</div>
          <div><label htmlFor="code" className="block text-sm font-medium mb-2">Subject Code *</label><Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className={errors.code ? 'border-red-500' : ''} />{errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}</div>
          <div><label htmlFor="maxScore" className="block text-sm font-medium mb-2">Max Score *</label><Input id="maxScore" type="number" value={formData.maxScore} onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })} className={errors.maxScore ? 'border-red-500' : ''} />{errors.maxScore && <p className="mt-1 text-sm text-red-600">{errors.maxScore}</p>}</div>
          <div><label htmlFor="description" className="block text-sm font-medium mb-2">Description</label><Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
          {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{saveError}</p></div>}
          <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => router.push('/dashboard/subjects')}>Cancel</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
