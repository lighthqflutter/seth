'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'public' | 'mid-term' | 'other';
}

export default function EditTermPage() {
  const router = useRouter();
  const params = useParams();
  const termId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
    academicYear: '',
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadTerm = async () => {
      try {
        const termDoc = await getDoc(doc(db, 'terms', termId));
        if (!termDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = termDoc.data();
        setFormData({
          name: data.name || '',
          startDate: data.startDate?.toDate().toISOString().split('T')[0] || '',
          endDate: data.endDate?.toDate().toISOString().split('T')[0] || '',
          isActive: data.isActive || false,
          academicYear: data.academicYear || '',
        });

        // Load existing holidays
        if (data.holidays && Array.isArray(data.holidays)) {
          const existingHolidays = data.holidays.map((h: any, index: number) => ({
            id: `${Date.now()}_${index}`,
            name: h.name || '',
            startDate: h.startDate?.toDate().toISOString().split('T')[0] || '',
            endDate: h.endDate?.toDate().toISOString().split('T')[0] || '',
            type: h.type || 'public',
          }));
          setHolidays(existingHolidays);
        }

        setLoading(false);
      } catch (error) {
        setNotFound(true);
        setLoading(false);
      }
    };
    if (termId) loadTerm();
  }, [termId]);

  const addHoliday = () => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      name: '',
      startDate: '',
      endDate: '',
      type: 'public',
    };
    setHolidays([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, field: keyof Holiday, value: string) => {
    setHolidays(holidays.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

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

    // Validate holidays
    holidays.forEach((holiday, index) => {
      if (holiday.name && holiday.startDate && holiday.endDate) {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        const termStart = new Date(formData.startDate);
        const termEnd = new Date(formData.endDate);

        if (holidayEnd < holidayStart) {
          newErrors[`holiday_${holiday.id}`] = 'Holiday end date must be after start date';
        }
        if (holidayStart < termStart || holidayEnd > termEnd) {
          newErrors[`holiday_${holiday.id}`] = 'Holiday dates must be within term dates';
        }
      } else if (holiday.name || holiday.startDate || holiday.endDate) {
        newErrors[`holiday_${holiday.id}`] = 'Please complete all holiday fields or remove it';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!validateForm()) return;
    setSaving(true);
    try {
      // Filter out empty holidays
      const validHolidays = holidays.filter(h => h.name && h.startDate && h.endDate);

      await updateDoc(doc(db, 'terms', termId), {
        name: formData.name.trim(),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: formData.isActive,
        academicYear: formData.academicYear.trim(),
        holidays: validHolidays.map(h => ({
          name: h.name.trim(),
          startDate: Timestamp.fromDate(new Date(h.startDate)),
          endDate: Timestamp.fromDate(new Date(h.endDate)),
          type: h.type,
        })),
        updatedAt: new Date(),
      });
      router.push('/dashboard/terms');
    } catch (error) {
      setSaveError('Failed to update term. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Term Not Found</h3>
            <Button onClick={() => router.push('/dashboard/terms')}>Back to Terms</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Term</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard/terms')}>
          Back to Terms
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Term Information */}
        <Card>
          <CardHeader>
            <CardTitle>Term Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Term Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., First Term 2024/2025"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year *
              </label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g., 2024/2025"
                className={errors.academicYear ? 'border-red-500' : ''}
              />
              {errors.academicYear && <p className="mt-1 text-sm text-red-600">{errors.academicYear}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Set as active term
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Holidays Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Holidays & Breaks</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Add or edit public holidays, mid-term breaks, or other non-school days
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addHoliday}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No holidays added yet</p>
                <p className="text-xs mt-1">Click "Add Holiday" to add public holidays or breaks</p>
              </div>
            ) : (
              <div className="space-y-4">
                {holidays.map((holiday, index) => (
                  <div
                    key={holiday.id}
                    className="p-4 border border-gray-200 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Holiday {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeHoliday(holiday.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Holiday Name
                        </label>
                        <Input
                          value={holiday.name}
                          onChange={(e) => updateHoliday(holiday.id, 'name', e.target.value)}
                          placeholder="e.g., Christmas Break"
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Type
                        </label>
                        <select
                          value={holiday.type}
                          onChange={(e) => updateHoliday(holiday.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="public">Public Holiday</option>
                          <option value="mid-term">Mid-Term Break</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={holiday.startDate}
                          onChange={(e) => updateHoliday(holiday.id, 'startDate', e.target.value)}
                          min={formData.startDate}
                          max={formData.endDate}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Date
                        </label>
                        <Input
                          type="date"
                          value={holiday.endDate}
                          onChange={(e) => updateHoliday(holiday.id, 'endDate', e.target.value)}
                          min={holiday.startDate || formData.startDate}
                          max={formData.endDate}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {errors[`holiday_${holiday.id}`] && (
                      <p className="text-xs text-red-600">{errors[`holiday_${holiday.id}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {saveError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Term'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/terms')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
