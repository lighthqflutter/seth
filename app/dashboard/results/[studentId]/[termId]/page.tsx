'use client';

/**
 * Student Result Detail Page (Phase 15)
 * Display comprehensive term result for a specific student
 *
 * Features:
 * - All subject scores with breakdown (CA1, CA2, CA3, Exam)
 * - Total, percentage, and grade for each subject
 * - Overall average and class position
 * - Performance summary (passed/failed subjects)
 * - Term-over-term comparison
 * - Downloadable PDF link
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectScore, calculateTermResult } from '@/lib/resultCalculation';
import { calculateGrade } from '@/lib/scoreCalculation';
import { GradingConfig } from '@/types';
import { downloadReportCard, previewReportCard } from '@/lib/pdfGenerator';
import { SkillsDisplay } from '@/components/SkillsDisplay';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  AcademicCapIcon,
  ChartBarIcon,
  EyeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { getAttendanceCategory } from '@/lib/attendance/config';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
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

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Score {
  id: string;
  subjectId: string;
  studentId: string;
  assessmentScores: { [key: string]: number | null };
  total: number;
  percentage: number;
  grade: string;
  isAbsent: boolean;
  isExempted: boolean;
  isPublished: boolean;
}

export default function StudentResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params.studentId as string;
  const termId = params.termId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [subjects, setSubjects] = useState<Map<string, Subject>>(new Map());
  const [skillRatings, setSkillRatings] = useState<Array<{ skillId: string; rating: string }>>([]);
  const [attendance, setAttendance] = useState<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    attendanceRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Mock grading config - in real app, fetch from tenant settings
  const gradingConfig: GradingConfig = {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A1', minScore: 75, maxScore: 100, description: 'Excellent' },
      { grade: 'B2', minScore: 70, maxScore: 74, description: 'Very Good' },
      { grade: 'C4', minScore: 60, maxScore: 69, description: 'Good' },
      { grade: 'C6', minScore: 50, maxScore: 59, description: 'Credit' },
      { grade: 'D7', minScore: 45, maxScore: 49, description: 'Pass' },
      { grade: 'E8', minScore: 40, maxScore: 44, description: 'Pass' },
      { grade: 'F9', minScore: 0, maxScore: 39, description: 'Fail' },
    ],
    passMark: 40,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: true,
      showRemark: true,
    },
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !studentId || !termId) return;

      try {
        // Load student
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) {
          setError('Student not found');
          setLoading(false);
          return;
        }
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
        setStudent(studentData);

        // Load class info
        const classDoc = await getDoc(doc(db, 'classes', studentData.currentClassId));
        if (classDoc.exists()) {
          setClassInfo({ id: classDoc.id, ...classDoc.data() } as ClassInfo);
        }

        // Load term
        const termDoc = await getDoc(doc(db, 'terms', termId));
        if (termDoc.exists()) {
          setTerm({ id: termDoc.id, ...termDoc.data() } as Term);
        }

        // Load scores for this student in this term
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', user.tenantId),
          where('studentId', '==', studentId),
          where('termId', '==', termId),
          where('isPublished', '==', true) // Only show published scores
        );

        const scoresSnapshot = await getDocs(scoresQuery);
        const scoresData = scoresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Score[];
        setScores(scoresData);

        // Load subjects
        const subjectIds = [...new Set(scoresData.map(s => s.subjectId))];
        const subjectsMap = new Map<string, Subject>();

        for (const subjectId of subjectIds) {
          const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
          if (subjectDoc.exists()) {
            subjectsMap.set(subjectId, {
              id: subjectDoc.id,
              ...subjectDoc.data(),
            } as Subject);
          }
        }
        setSubjects(subjectsMap);

        // Load skill ratings for this student in this term
        const skillRatingsQuery = query(
          collection(db, 'skillRatings'),
          where('tenantId', '==', user.tenantId),
          where('studentId', '==', studentId),
          where('termId', '==', termId)
        );

        const skillRatingsSnapshot = await getDocs(skillRatingsQuery);
        const skillRatingsData = skillRatingsSnapshot.docs.map(doc => ({
          skillId: doc.data().skillId,
          rating: doc.data().rating,
        }));
        setSkillRatings(skillRatingsData);

        // Load attendance data for the term
        if (termDoc.exists()) {
          const termStartDate = termDoc.data().startDate?.toDate ? termDoc.data().startDate.toDate() : new Date(termDoc.data().startDate);
          const termEndDate = termDoc.data().endDate?.toDate ? termDoc.data().endDate.toDate() : new Date(termDoc.data().endDate);

          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('tenantId', '==', user.tenantId),
            where('studentId', '==', studentId)
          );

          const attendanceSnapshot = await getDocs(attendanceQuery);
          const attendanceRecords = attendanceSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                ...data,
                date: data.date.toDate ? data.date.toDate() : new Date(data.date),
                status: data.status as string,
              };
            })
            .filter(record =>
              record.date >= termStartDate && record.date <= termEndDate
            );

          // Calculate attendance statistics
          const totalDays = attendanceRecords.length;
          const presentDays = attendanceRecords.filter(r =>
            ['present', 'late'].includes(r.status)
          ).length;
          const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
          const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
          const excusedDays = attendanceRecords.filter(r =>
            ['excused', 'sick', 'permission'].includes(r.status)
          ).length;
          const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

          if (totalDays > 0) {
            setAttendance({
              totalDays,
              presentDays,
              absentDays,
              lateDays,
              excusedDays,
              attendanceRate,
            });
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading result:', err);
        setError('Failed to load result');
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, studentId, termId]);

  const getGradeBadgeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D') || grade.startsWith('E')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRemark = (average: number): string => {
    if (average >= 75) return 'Excellent performance';
    if (average >= 70) return 'Very good performance';
    if (average >= 60) return 'Good performance';
    if (average >= 50) return 'Satisfactory performance';
    if (average >= 40) return 'Fair performance';
    return 'Needs improvement';
  };

  // PDF download handlers
  const handleDownloadPDF = async () => {
    if (!user?.tenantId || !student || !term) return;

    setDownloadingPDF(true);
    try {
      // TODO: Get actual position and class size from class results
      // For now, using placeholder values
      const position = 1; // This should come from class ranking
      const classSize = 30; // This should come from class enrollment count

      await downloadReportCard(
        {
          studentId,
          termId,
          tenantId: user.tenantId,
          position,
          classSize,
          teacherComment: 'Good work. Keep it up!', // TODO: Allow teachers to add comments
          principalComment: 'Well done!', // TODO: Allow principal to add comments
        },
        `${student.firstName}_${student.lastName}_${term.name.replace(/\s+/g, '_')}_Report.pdf`
      );

      alert('Report card downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download report card. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!user?.tenantId || !student || !term) return;

    setDownloadingPDF(true);
    try {
      const position = 1;
      const classSize = 30;

      await previewReportCard({
        studentId,
        termId,
        tenantId: user.tenantId,
        position,
        classSize,
        teacherComment: 'Good work. Keep it up!',
        principalComment: 'Well done!',
      });
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Failed to preview report card. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
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
            onClick={() => router.push('/dashboard/results')}
          >
            Back to Results
          </Button>
        </div>
      </div>
    );
  }

  // Calculate term result
  const subjectScores: SubjectScore[] = scores.map(score => ({
    subjectId: score.subjectId,
    subjectName: subjects.get(score.subjectId)?.name || 'Unknown Subject',
    total: score.total,
    percentage: score.percentage,
    grade: score.grade,
    maxScore: 100,
    isAbsent: score.isAbsent,
    isExempted: score.isExempted,
  }));

  const termResult = calculateTermResult(subjectScores, {
    passMark: gradingConfig.passMark,
  });

  const overallGrade = calculateGrade(termResult.averageScore, gradingConfig);
  const remark = getRemark(termResult.averageScore);

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
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              {student.admissionNumber} • {classInfo?.name} • {term?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewPDF}
              disabled={downloadingPDF}
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              Preview PDF
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {downloadingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {termResult.totalScore.toFixed(1)}
                </p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {termResult.averageScore.toFixed(1)}%
                </p>
              </div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getGradeBadgeColor(overallGrade)}`}>
                {overallGrade}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Subjects</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold text-gray-900">
                  {termResult.numberOfSubjects}
                </p>
                <div className="text-right text-sm">
                  <p className="text-green-600">{termResult.subjectsPassed} passed</p>
                  <p className="text-red-600">{termResult.subjectsFailed} failed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  --
                </p>
                <p className="text-xs text-gray-500">out of --</p>
              </div>
              <AcademicCapIcon className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remark Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Remark</h3>
              <p className="text-gray-700">{remark}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {attendance && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-green-600" />
                Attendance Summary
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/attendance/student/${studentId}`)}
              >
                View Full History
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Total Days</p>
                <p className="text-2xl font-bold text-gray-900">{attendance.totalDays}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendance.presentDays}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-gray-600 mb-1">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendance.absentDays}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-gray-600 mb-1">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendance.lateDays}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Excused</p>
                <p className="text-2xl font-bold text-blue-600">{attendance.excusedDays}</p>
              </div>
              <div className={`p-4 rounded-lg border ${
                getAttendanceCategory(attendance.attendanceRate).color.includes('green') ? 'bg-green-50 border-green-200' :
                getAttendanceCategory(attendance.attendanceRate).color.includes('blue') ? 'bg-blue-50 border-blue-200' :
                getAttendanceCategory(attendance.attendanceRate).color.includes('yellow') ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs text-gray-600 mb-1">Rate</p>
                <p className={`text-2xl font-bold ${getAttendanceCategory(attendance.attendanceRate).color}`}>
                  {attendance.attendanceRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {getAttendanceCategory(attendance.attendanceRate).label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Scores Table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject Scores</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA1 (10)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA2 (10)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA3 (10)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam (70)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remark
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No scores available for this term
                    </td>
                  </tr>
                ) : (
                  scores.map((score) => {
                    const subject = subjects.get(score.subjectId);
                    const remark = score.percentage >= gradingConfig.passMark ? 'Pass' : 'Fail';

                    return (
                      <tr key={score.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {subject?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{subject?.code}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {score.isAbsent ? 'ABS' : score.assessmentScores['ca1'] ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {score.isAbsent ? 'ABS' : score.assessmentScores['ca2'] ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {score.isAbsent ? 'ABS' : score.assessmentScores['ca3'] ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {score.isAbsent ? 'ABS' : score.assessmentScores['exam'] ?? '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {score.isAbsent ? 'ABS' : score.total.toFixed(1)}
                          </span>
                          <div className="text-xs text-gray-500">
                            {score.isAbsent ? '' : `${score.percentage.toFixed(1)}%`}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {score.isAbsent ? (
                            <span className="text-sm text-gray-500">ABS</span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeBadgeColor(score.grade)}`}>
                              {score.grade}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {score.isAbsent ? (
                            <span className="text-sm text-gray-500">Absent</span>
                          ) : (
                            <span className={`text-sm font-medium ${remark === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                              {remark}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Conduct Ratings */}
      <SkillsDisplay ratings={skillRatings} showSummary={true} />
    </div>
  );
}
