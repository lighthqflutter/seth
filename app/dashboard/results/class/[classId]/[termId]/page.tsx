'use client';

/**
 * Class Results Overview Page (Phase 15)
 * Display all student results for a class in a specific term
 *
 * Features:
 * - List all students with their results
 * - Overall class statistics
 * - Top performers highlight
 * - Subject-wise performance
 * - Quick access to individual results
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectScore, calculateTermResult, calculateClassPositions } from '@/lib/resultCalculation';
import { downloadBulkReportCards } from '@/lib/pdfGenerator';
import {
  ArrowLeftIcon,
  TrophyIcon,
  ChartBarIcon,
  UserIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
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
}

interface Score {
  id: string;
  subjectId: string;
  studentId: string;
  total: number;
  percentage: number;
  grade: string;
  isAbsent: boolean;
  isExempted: boolean;
}

interface StudentResult {
  student: Student;
  totalScore: number;
  averageScore: number;
  numberOfSubjects: number;
  position?: number;
  overallGrade: string;
}

export default function ClassResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const classId = params.classId as string;
  const termId = params.termId as string;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingBulk, setDownloadingBulk] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !classId || !termId) return;

      try {
        // Load class info
        const classDoc = await getDoc(doc(db, 'classes', classId));
        if (!classDoc.exists()) {
          setError('Class not found');
          setLoading(false);
          return;
        }
        setClassInfo({ id: classDoc.id, ...classDoc.data() } as ClassInfo);

        // Load term
        const termDoc = await getDoc(doc(db, 'terms', termId));
        if (termDoc.exists()) {
          setTerm({ id: termDoc.id, ...termDoc.data() } as Term);
        }

        // Load students in this class
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', classId),
          where('isActive', '==', true)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];
        setStudents(studentsData);

        // Load all scores for this class and term
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', user.tenantId),
          where('classId', '==', classId),
          where('termId', '==', termId),
          where('isPublished', '==', true)
        );

        const scoresSnapshot = await getDocs(scoresQuery);
        const scoresData = scoresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Score[];
        setScores(scoresData);

        // Calculate results for each student
        const studentResults: StudentResult[] = studentsData.map(student => {
          const studentScores = scoresData.filter(s => s.studentId === student.id);

          const subjectScores: SubjectScore[] = studentScores.map(score => ({
            subjectId: score.subjectId,
            subjectName: '', // Not needed for calculation
            total: score.total,
            percentage: score.percentage,
            grade: score.grade,
            maxScore: 100,
            isAbsent: score.isAbsent,
            isExempted: score.isExempted,
          }));

          const termResult = calculateTermResult(subjectScores, { passMark: 40 });

          // Determine overall grade based on average
          let overallGrade = 'F9';
          if (termResult.averageScore >= 75) overallGrade = 'A1';
          else if (termResult.averageScore >= 70) overallGrade = 'B2';
          else if (termResult.averageScore >= 60) overallGrade = 'C4';
          else if (termResult.averageScore >= 50) overallGrade = 'C6';
          else if (termResult.averageScore >= 45) overallGrade = 'D7';
          else if (termResult.averageScore >= 40) overallGrade = 'E8';

          return {
            student,
            totalScore: termResult.totalScore,
            averageScore: termResult.averageScore,
            numberOfSubjects: termResult.numberOfSubjects,
            overallGrade,
          };
        });

        // Calculate positions
        const resultsWithPositions = calculateClassPositions(
          studentResults.map(r => ({
            studentId: r.student.id,
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            totalScore: r.totalScore,
            averageScore: r.averageScore,
            numberOfSubjects: r.numberOfSubjects,
          }))
        );

        // Merge positions back
        const finalResults = studentResults.map(result => {
          const withPosition = resultsWithPositions.find(r => r.studentId === result.student.id);
          return {
            ...result,
            position: withPosition?.position,
          };
        });

        // Sort by position
        finalResults.sort((a, b) => (a.position || 999) - (b.position || 999));

        setResults(finalResults);
        setLoading(false);
      } catch (err) {
        console.error('Error loading class results:', err);
        setError('Failed to load class results');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, classId, termId]);

  const getGradeBadgeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D') || grade.startsWith('E')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getPositionSuffix = (position: number): string => {
    const lastDigit = position % 10;
    const lastTwoDigits = position % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th';
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  };

  // Bulk PDF download handler
  const handleBulkDownload = async () => {
    if (!user?.tenantId || !term || results.length === 0) return;

    const confirmed = confirm(
      `This will download ${results.length} report cards. This may take a few minutes. Continue?`
    );
    if (!confirmed) return;

    setDownloadingBulk(true);
    try {
      const studentsForDownload = results.map(result => ({
        studentId: result.student.id,
        studentName: `${result.student.firstName} ${result.student.lastName}`,
        position: result.position || 0,
        teacherComment: 'Good work. Keep it up!', // TODO: Allow teachers to add individual comments
      }));

      await downloadBulkReportCards(
        studentsForDownload,
        termId,
        term.name,
        user.tenantId,
        results.length,
        'Excellent performance this term. Well done to all students!' // TODO: Allow principal to add comment
      );

      alert(`Successfully downloaded ${results.length} report cards!`);
    } catch (error) {
      console.error('Error downloading bulk report cards:', error);
      alert('Failed to download some report cards. Please check the console for details.');
    } finally {
      setDownloadingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error || 'Class not found'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/results')}
          >
            Back to Results
          </Button>
        </div>
      </div>
    );
  }

  // Calculate class statistics
  const classAverage = results.length > 0
    ? results.reduce((sum, r) => sum + r.averageScore, 0) / results.length
    : 0;
  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.averageScore))
    : 0;
  const lowestScore = results.length > 0
    ? Math.min(...results.map(r => r.averageScore))
    : 0;

  const topPerformers = results.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/results')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Results
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classInfo.name} - Results
            </h1>
            <p className="text-gray-600 mt-1">{term?.name}</p>
          </div>
          {results.length > 0 && (
            <Button
              onClick={handleBulkDownload}
              disabled={downloadingBulk}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {downloadingBulk ? 'Downloading...' : `Download All (${results.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{results.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Class Average</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {classAverage.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Highest Score</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {highestScore.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Lowest Score</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {lowestScore.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((result, index) => (
                <div
                  key={result.student.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        'bg-orange-100 text-orange-600'
                      } font-bold mr-2`}>
                        {result.position}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {result.student.firstName} {result.student.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{result.student.admissionNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-blue-600">
                      {result.averageScore.toFixed(1)}%
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeBadgeColor(result.overallGrade)}`}>
                      {result.overallGrade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Students Results */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Students</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No results available for this class
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr key={result.student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">
                          {result.position}
                          <span className="text-xs text-gray-500">
                            {getPositionSuffix(result.position || 0)}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {result.student.firstName} {result.student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.student.admissionNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {result.numberOfSubjects}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                        {result.totalScore.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-blue-600">
                          {result.averageScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeBadgeColor(result.overallGrade)}`}>
                          {result.overallGrade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/results/${result.student.id}/${termId}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
