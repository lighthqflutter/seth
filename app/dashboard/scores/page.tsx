'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Class {
  id: string;
  name: string;
  level: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export default function ScoresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
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

        // Load subjects
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('tenantId', '==', user.tenantId),
          orderBy('name')
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Subject[];
        setSubjects(subjectsData);

        // Load terms
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId)
        );
        const termsSnapshot = await getDocs(termsQuery);
        const termsData = termsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
          };
        }) as Term[];
        setTerms(termsData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  const handleContinue = () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      alert('Please select a class, subject, and term');
      return;
    }

    router.push(
      `/dashboard/scores/entry?classId=${selectedClass}&subjectId=${selectedSubject}&termId=${selectedTerm}`
    );
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enter Scores</h1>
          <p className="text-gray-600 mt-1">Select a class, subject, and term to enter scores</p>
        </div>
        {user?.role === 'admin' && (
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/scores/configurations')}
          >
            Manage Configurations
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Entry Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class <span className="text-red-500">*</span>
            </label>
            {classes.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p>No classes found. Please create a class first.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/dashboard/classes/new')}
                >
                  Create Class
                </Button>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Choose a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject <span className="text-red-500">*</span>
            </label>
            {subjects.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p>No subjects found. Please create a subject first.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/dashboard/subjects/new')}
                >
                  Create Subject
                </Button>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">Choose a subject...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Term Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Term <span className="text-red-500">*</span>
            </label>
            {terms.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p>No terms found. Please create a term first.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/dashboard/terms/new')}
                >
                  Create Term
                </Button>
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                <option value="">Choose a term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Continue Button */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleContinue}
              disabled={!selectedClass || !selectedSubject || !selectedTerm}
              className="flex-1"
            >
              Continue to Score Entry
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Before you start:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Ensure you have created at least one class</li>
            <li>Add subjects that will be taught</li>
            <li>Create academic terms (e.g., First Term, Second Term)</li>
            <li>Add students to the selected class</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
