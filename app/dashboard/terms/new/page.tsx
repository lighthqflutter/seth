'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function NewTermPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    academicYear: '',
  });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Term name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    } else if (!/^\d{4}\/\d{4}$/.test(formData.academicYear)) {
      newErrors.academicYear = 'Academic year must be in format YYYY/YYYY';
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
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
      await addDoc(collection(db, 'terms'), {
        name: formData.name.trim(),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isCurrent: formData.isCurrent,
        academicYear: formData.academicYear.trim(),
        tenantId: user?.tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      router.push('/dashboard/terms');
    } catch (error) {
      setSaveError('Failed to create term. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Term</h1>
      <Card><CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label htmlFor="name" className="block text-sm font-medium mb-2">Term Name *</label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., First Term 2024/2025" className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}</div>
          <div><label htmlFor="startDate" className="block text-sm font-medium mb-2">Start Date *</label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={errors.startDate ? 'border-red-500' : ''} />{errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}</div>
          <div><label htmlFor="endDate" className="block text-sm font-medium mb-2">End Date *</label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={errors.endDate ? 'border-red-500' : ''} />{errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}</div>
          <div><label htmlFor="academicYear" className="block text-sm font-medium mb-2">Academic Year *</label><Input id="academicYear" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} placeholder="e.g., 2024/2025" className={errors.academicYear ? 'border-red-500' : ''} />{errors.academicYear && <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>}</div>
          <div className="flex items-center gap-2"><input id="isCurrent" type="checkbox" checked={formData.isCurrent} onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })} className="h-4 w-4 rounded border-gray-300" /><label htmlFor="isCurrent" className="text-sm font-medium">Set as current term</label></div>
          {saveError && <div className="p-4 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-600">{saveError}</p></div>}
          <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button><Button type="button" variant="outline" onClick={() => router.push('/dashboard/terms')}>Cancel</Button></div>
        </form>
      </CardContent></Card>
    </div>
  );
}
