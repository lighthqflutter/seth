'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface FormData {
  name: string;
  email: string;
  phone: string;
}

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeacher = async () => {
      try {
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
        });
        setLoading(false);
      } catch (error) {
        setNotFound(true);
        setLoading(false);
      }
    };
    if (teacherId) loadTeacher();
  }, [teacherId]);

  const validateForm = (): boolean => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Teacher name is required';
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
    if (!validateForm()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', teacherId), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        updatedAt: new Date(),
      });
      router.push('/dashboard/teachers');
    } catch (error) {
      setSaveError('Failed to update teacher. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (notFound) return <div className="max-w-2xl mx-auto"><Card><CardContent className="py-12 text-center"><h3 className="text-lg font-semibold mb-2">Teacher Not Found</h3><Button onClick={() => router.push('/dashboard/teachers')}>Back to Teachers</Button></CardContent></Card></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Teacher</h1>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label htmlFor="name" className="block text-sm font-medium mb-2">Teacher Name *</label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}</div>
          <div><label htmlFor="email" className="block text-sm font-medium mb-2">Email *</label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={errors.email ? 'border-red-500' : ''} />{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}</div>
          <div><label htmlFor="phone" className="block text-sm font-medium mb-2">Phone (Optional)</label><Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{saveError}</p></div>}
          <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => router.push('/dashboard/teachers')}>Cancel</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
