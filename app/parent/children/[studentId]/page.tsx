'use client';

/**
 * Child Results View for Parents (Phase 16)
 * View all published results for a specific child
 *
 * Features:
 * - Child profile summary
 * - All published results by term
 * - Performance trends
 * - Download report cards
 * - Term-by-term history
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectScore, calculateTermResult } from '@/lib/resultCalculation';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  UserIcon,
  AcademicCapIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  dateOfBirth: any;
  gender: string;
  guardianIds: string[];
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
  startDate: any;
  endDate: any;
}

interface Score {
  id: string;
  subjectId: string;
  termId: string;
  total: number;
  percentage: number;
  grade: string;
  isAbsent: boolean;
  isExempted: boolean;
}

interface TermResult {
  term: Term;
  averageScore: number;
  totalScore: number;
  numberOfSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
  overallGrade: string;
  scores: Score[];
}

export default function ChildResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [termResults, setTermResults] = useState<TermResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !user?.uid || !studentId) return;

      // Redirect non-parents
      if (user.role !== 'parent') {
        router.push('/dashboard');
        return;
      }

      try {
        // Load student and verify parent access
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setError('Student not found');
          setLoading(false);
          return;
        }

        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;

        // Verify this parent has access to this child
        if (!studentData.guardianIds || !studentData.guardianIds.includes(user.uid)) {
          setError('You do not have access to view this student');
          setLoading(false);
          return;
        }

        setStudent(studentData);

        // Load class info
        const classDoc = await getDoc(doc(db, 'classes', studentData.currentClassId));
        if (classDoc.exists()) {
          setClassInfo({ id: classDoc.id, ...classDoc.data() } as ClassInfo);
        }

        // Load all published scores for this student
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', user.tenantId),
          where('studentId', '==', studentId),
          where('isPublished', '==', true) // Parents see only published scores
        );

        const scoresSnapshot = await getDocs(scoresQuery);
        const scoresData = scoresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Score[];

        // Group scores by term
        const scoresByTerm = new Map<string, Score[]>();
        scoresData.forEach(score => {
          if (!scoresByTerm.has(score.termId)) {
            scoresByTerm.set(score.termId, []);
          }
          scoresByTerm.get(score.termId)!.push(score);
        });

        // Load term info and calculate results
        const termResultsData: TermResult[] = [];
        for (const [termId, scores] of scoresByTerm) {
          const termDoc = await getDoc(doc(db, 'terms', termId));
          if (termDoc.exists()) {
            const term = { id: termDoc.id, ...termDoc.data() } as Term;

            // Calculate term result
            const subjectScores: SubjectScore[] = scores.map(score => ({
              subjectId: score.subjectId,
              subjectName: '',
              total: score.total,
              percentage: score.percentage,
              grade: score.grade,
              maxScore: 100,
              isAbsent: score.isAbsent,
              isExempted: score.isExempted,
            }));

            const termResult = calculateTermResult(subjectScores, { passMark: 40 });

            // Determine overall grade
            let overallGrade = 'F9';
            if (termResult.averageScore >= 75) overallGrade = 'A1';
            else if (termResult.averageScore >= 70) overallGrade = 'B2';
            else if (termResult.averageScore >= 60) overallGrade = 'C4';
            else if (termResult.averageScore >= 50) overallGrade = 'C6';
            else if (termResult.averageScore >= 45) overallGrade = 'D7';
            else if (termResult.averageScore >= 40) overallGrade = 'E8';

            termResultsData.push({
              term,
              averageScore: termResult.averageScore,
              totalScore: termResult.totalScore,
              numberOfSubjects: termResult.numberOfSubjects,
              subjectsPassed: termResult.subjectsPassed,
              subjectsFailed: termResult.subjectsFailed,
              overallGrade,
              scores,
            });
          }
        }

        // Sort by term start date (most recent first)
        termResultsData.sort((a, b) => {
          const dateA = a.term.startDate?.toDate?.() || new Date(0);
          const dateB = b.term.startDate?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setTermResults(termResultsData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading child results:', err);
        setError('Failed to load child results');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, user?.uid, user?.role, studentId, router]);

  const getGradeBadgeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D') || grade.startsWith('E')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error || 'Student not found'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/parent/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/parent/dashboard')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <UserIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-gray-600 mt-1">
                {student.admissionNumber} • {classInfo?.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Admission Number</p>
              <p className="text-sm font-medium text-gray-900">{student.admissionNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Class</p>
              <p className="text-sm font-medium text-gray-900">
                {classInfo?.name || 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{student.gender}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Term Results */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Performance</h2>
        {termResults.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Available</h3>
              <p className="text-gray-600">
                No published results are available for this student yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {termResults.map((termResult) => (
              <Card key={termResult.term.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {termResult.term.name}
                      </h3>
                      <p className="text-sm text-gray-600">{termResult.term.academicYear}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/results/${studentId}/${termResult.term.id}`)}
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Average</p>
                      <p className="text-lg font-bold text-blue-600">
                        {termResult.averageScore.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Score</p>
                      <p className="text-lg font-bold text-gray-900">
                        {termResult.totalScore.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Subjects</p>
                      <p className="text-lg font-bold text-gray-900">
                        {termResult.numberOfSubjects}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Passed</p>
                      <p className="text-lg font-bold text-green-600">
                        {termResult.subjectsPassed}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Grade</p>
                      <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getGradeBadgeColor(termResult.overallGrade)}`}>
                        {termResult.overallGrade}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Performance Summary */}
      {termResults.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Terms Completed</p>
                <p className="text-3xl font-bold text-blue-600">{termResults.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Average Performance</p>
                <p className="text-3xl font-bold text-green-600">
                  {(termResults.reduce((sum, r) => sum + r.averageScore, 0) / termResults.length).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
                <p className="text-3xl font-bold text-purple-600">
                  {termResults[0]?.numberOfSubjects || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
