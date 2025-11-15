'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function EditTermPage() {
  const router = useRouter();
  const params = useParams();
  const termId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', isCurrent: false, academicYear: '' });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTerm = async () => {
      try {
        const termDoc = await getDoc(doc(db, 'terms', termId));
        if (!termDoc.exists()) { setNotFound(true); setLoading(false); return; }
        const data = termDoc.data();
        setFormData({
          name: data.name || '',
          startDate: data.startDate?.toDate().toISOString().split('T')[0] || '',
          endDate: data.endDate?.toDate().toISOString().split('T')[0] || '',
          isCurrent: data.isCurrent || false,
          academicYear: data.academicYear || '',
        });
        setLoading(false);
      } catch (error) { setNotFound(true); setLoading(false); }
    };
    if (termId) loadTerm();
  }, [termId]);

  const validateForm = (): boolean => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Term name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.academicYear.trim() || !/^\d{4}\/\d{4}$/.test(formData.academicYear)) newErrors.academicYear = 'Academic year must be in format YYYY/YYYY';
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) newErrors.endDate = 'End date must be after start date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'terms', termId), {
        name: formData.name.trim(),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isCurrent: formData.isCurrent,
        academicYear: formData.academicYear.trim(),
        updatedAt: new Date(),
      });
      router.push('/dashboard/terms');
    } catch (error) { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (notFound) return <div className="max-w-2xl mx-auto"><Card><CardContent className="py-12 text-center"><h3 className="text-lg font-semibold mb-2">Term Not Found</h3><Button onClick={() => router.push('/dashboard/terms')}>Back to Terms</Button></CardContent></Card></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Term</h1>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label htmlFor="name" className="block text-sm font-medium mb-2">Term Name *</label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}</div>
          <div><label htmlFor="startDate" className="block text-sm font-medium mb-2">Start Date *</label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={errors.startDate ? 'border-red-500' : ''} />{errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}</div>
          <div><label htmlFor="endDate" className="block text-sm font-medium mb-2">End Date *</label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={errors.endDate ? 'border-red-500' : ''} />{errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}</div>
          <div><label htmlFor="academicYear" className="block text-sm font-medium mb-2">Academic Year *</label><Input id="academicYear" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} className={errors.academicYear ? 'border-red-500' : ''} />{errors.academicYear && <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>}</div>
          <div className="flex items-center gap-2"><input id="isCurrent" type="checkbox" checked={formData.isCurrent} onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })} className="h-4 w-4 rounded border-gray-300" /><label htmlFor="isCurrent" className="text-sm font-medium">Set as current term</label></div>
          <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => router.push('/dashboard/terms')}>Cancel</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
