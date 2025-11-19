'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Term {
  id: string;
  name: string;
  academicYear: string;
  isCurrent: boolean;
}

export default function NewPromotionCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    termId: '',
    academicYear: '',
    newAcademicYear: '',
    submissionDeadline: '',
    executionDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load terms
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId)
        );
        const termsSnapshot = await getDocs(termsQuery);
        const termsData = termsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Term[];
        setTerms(termsData);

        // Auto-select current term
        const currentTerm = termsData.find(t => t.isCurrent);
        if (currentTerm) {
          setFormData(prev => ({
            ...prev,
            termId: currentTerm.id,
            academicYear: currentTerm.academicYear,
            name: `End of Year ${currentTerm.academicYear}`,
          }));
        }

        // Load total classes count
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        setTotalClasses(classesSnapshot.size);

        // Load total students count
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        setTotalStudents(studentsSnapshot.size);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.termId) {
      newErrors.termId = 'Please select a term';
    }

    if (!formData.newAcademicYear.trim()) {
      newErrors.newAcademicYear = 'New academic year is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !user) return;

    setSaving(true);

    try {
      const campaignData = {
        tenantId: user.tenantId,
        name: formData.name.trim(),
        academicYear: formData.academicYear,
        newAcademicYear: formData.newAcademicYear.trim(),
        termId: formData.termId,
        status: 'draft' as const,
        submissionDeadline: formData.submissionDeadline
          ? Timestamp.fromDate(new Date(formData.submissionDeadline))
          : null,
        executionDate: formData.executionDate
          ? Timestamp.fromDate(new Date(formData.executionDate))
          : null,
        totalClasses,
        submittedClasses: 0,
        approvedClasses: 0,
        totalStudents,
        processedStudents: 0,
        createdBy: user.uid,
        createdByName: user.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'promotion_campaigns'), campaignData);

      alert('Campaign created successfully!');
      router.push(`/dashboard/promotion/${docRef.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/promotion')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Promotion Campaign</h1>
        <p className="text-gray-600 mt-1">Set up a new campaign for student promotions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
            <CardDescription>Basic details about this promotion cycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., End of Year 2024/2025"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="termId" className="block text-sm font-medium text-gray-700 mb-2">
                Term *
              </label>
              <select
                id="termId"
                value={formData.termId}
                onChange={(e) => {
                  const selectedTerm = terms.find(t => t.id === e.target.value);
                  setFormData({
                    ...formData,
                    termId: e.target.value,
                    academicYear: selectedTerm?.academicYear || '',
                  });
                }}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.termId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.academicYear}) {term.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              {errors.termId && <p className="mt-1 text-sm text-red-600">{errors.termId}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Academic Year
                </label>
                <Input
                  value={formData.academicYear}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="newAcademicYear" className="block text-sm font-medium text-gray-700 mb-2">
                  New Academic Year *
                </label>
                <Input
                  id="newAcademicYear"
                  value={formData.newAcademicYear}
                  onChange={(e) => setFormData({ ...formData, newAcademicYear: e.target.value })}
                  placeholder="e.g., 2025/2026"
                  className={errors.newAcademicYear ? 'border-red-500' : ''}
                />
                {errors.newAcademicYear && (
                  <p className="mt-1 text-sm text-red-600">{errors.newAcademicYear}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Deadlines (Optional)</CardTitle>
            <CardDescription>Set important dates for the campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="submissionDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Submission Deadline
              </label>
              <Input
                id="submissionDeadline"
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Date by which teachers must submit their promotion decisions
              </p>
            </div>

            <div>
              <label htmlFor="executionDate" className="block text-sm font-medium text-gray-700 mb-2">
                Planned Execution Date
              </label>
              <Input
                id="executionDate"
                type="date"
                value={formData.executionDate}
                onChange={(e) => setFormData({ ...formData, executionDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                When you plan to execute the promotions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-700 mb-1">Total Classes</div>
                <div className="text-2xl font-bold text-blue-900">{totalClasses}</div>
              </div>
              <div>
                <div className="text-blue-700 mb-1">Total Students</div>
                <div className="text-2xl font-bold text-blue-900">{totalStudents}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-blue-800">
              This campaign will manage the promotion of {totalStudents} students across {totalClasses} classes
              from {formData.academicYear} to {formData.newAcademicYear || '(not set)'}.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/promotion')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}
