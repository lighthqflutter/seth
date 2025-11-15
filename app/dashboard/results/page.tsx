'use client';

/**
 * Results Landing Page (Phase 15)
 * Browse and access student results
 *
 * Features:
 * - List all classes
 * - Select term
 * - Quick access to student results
 * - Class-wide results view
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AcademicCapIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Class {
  id: string;
  name: string;
  level: string;
  studentCount: number;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
  isCurrent: boolean;
}

export default function ResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          orderBy('name')
        );

        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Class[];
        setClasses(classesData);

        // Load terms
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId),
          orderBy('startDate', 'desc')
        );

        const termsSnapshot = await getDocs(termsQuery);
        const termsData = termsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Term[];
        setTerms(termsData);

        // Set current term as default
        const currentTerm = termsData.find(t => t.isCurrent);
        if (currentTerm) {
          setSelectedTerm(currentTerm.id);
        } else if (termsData.length > 0) {
          setSelectedTerm(termsData[0].id);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  const handleClassClick = (classId: string) => {
    if (!selectedTerm) {
      alert('Please select a term first');
      return;
    }
    router.push(`/dashboard/results/class/${classId}/${selectedTerm}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Results</h1>
        <p className="text-gray-600 mt-1">View and manage student results</p>
      </div>

      {/* Term Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label htmlFor="term" className="text-sm font-medium text-gray-700">
              Select Term:
            </label>
            <select
              id="term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {terms.length === 0 ? (
                <option value="">No terms available</option>
              ) : (
                terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} {term.isCurrent ? '(Current)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Class</h2>
        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Found</h3>
              <p className="text-gray-600">Create classes to view results</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Card
                key={classItem.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleClassClick(classItem.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {classItem.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">{classItem.level}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <AcademicCapIcon className="h-5 w-5 mr-2" />
                        {classItem.studentCount || 0} students
                      </div>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    View Results
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
