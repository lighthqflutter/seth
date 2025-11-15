'use client';

/**
 * Academic Performance Analytics (Phase 22)
 * Detailed academic analysis with comprehensive charts
 *
 * Features:
 * - Subject performance trends
 * - Class comparison
 * - Grade distribution
 * - Pass/fail rates
 * - Performance heatmaps
 * - Top/bottom performers
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface SubjectPerformance {
  subject: string;
  subjectId: string;
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
  totalStudents: number;
  trend: 'up' | 'down' | 'stable';
}

interface ClassPerformance {
  className: string;
  classId: string;
  average: number;
  totalStudents: number;
  topStudent: string;
  passRate: number;
}

interface TopPerformer {
  studentId: string;
  studentName: string;
  className: string;
  average: number;
  totalSubjects: number;
}

interface SubjectDifficulty {
  subject: string;
  difficulty: number; // 0-100, lower = harder
  failRate: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AcademicAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [terms, setTerms] = useState<Array<{ id: string; name: string }>>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [bottomPerformers, setBottomPerformers] = useState<TopPerformer[]>([]);
  const [subjectDifficulty, setSubjectDifficulty] = useState<SubjectDifficulty[]>([]);
  const [overallStats, setOverallStats] = useState({
    schoolAverage: 0,
    totalStudents: 0,
    totalSubjects: 0,
    overallPassRate: 0,
  });

  useEffect(() => {
    const loadTerms = async () => {
      if (!user?.tenantId) return;

      try {
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const termsSnapshot = await getDocs(termsQuery);
        const termsData = termsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));

        setTerms(termsData);
        if (termsData.length > 0 && !selectedTerm) {
          setSelectedTerm(termsData[0].id);
        }
      } catch (error) {
        console.error('Error loading terms:', error);
      }
    };

    loadTerms();
  }, [user?.tenantId]);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user?.tenantId || !selectedTerm) return;

      setLoading(true);
      try {
        // Load all scores for selected term
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', user.tenantId),
          where('termId', '==', selectedTerm),
          where('isPublished', '==', true)
        );
        const scoresSnapshot = await getDocs(scoresQuery);
        const scores = scoresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Load subjects
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjects = new Map(
          subjectsSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        // Load students
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const students = new Map(
          studentsSnapshot.docs.map(doc => [
            doc.id,
            {
              name: `${doc.data().firstName} ${doc.data().lastName}`,
              classId: doc.data().currentClassId,
            },
          ])
        );

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classes = new Map(
          classesSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        // Calculate subject performance
        const subjectStats: { [key: string]: { scores: number[]; passed: number } } = {};
        scores.forEach(score => {
          if (!subjectStats[score.subjectId]) {
            subjectStats[score.subjectId] = { scores: [], passed: 0 };
          }
          subjectStats[score.subjectId].scores.push(score.percentage || 0);
          if (score.percentage >= 40) {
            subjectStats[score.subjectId].passed++;
          }
        });

        const subjectPerfData: SubjectPerformance[] = Object.entries(subjectStats)
          .map(([subjectId, stats]) => {
            const average = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
            const passRate = (stats.passed / stats.scores.length) * 100;
            const highest = Math.max(...stats.scores);
            const lowest = Math.min(...stats.scores);

            return {
              subject: subjects.get(subjectId) || 'Unknown',
              subjectId,
              average: Math.round(average),
              highest: Math.round(highest),
              lowest: Math.round(lowest),
              passRate: Math.round(passRate),
              totalStudents: stats.scores.length,
              trend: 'stable' as 'stable', // Would need historical data for real trends
            };
          })
          .sort((a, b) => b.average - a.average);

        setSubjectPerformance(subjectPerfData);

        // Calculate class performance
        const classStats: { [key: string]: { scores: number[]; students: Set<string> } } = {};
        scores.forEach(score => {
          const student = students.get(score.studentId);
          if (student?.classId) {
            if (!classStats[student.classId]) {
              classStats[student.classId] = { scores: [], students: new Set() };
            }
            classStats[student.classId].scores.push(score.percentage || 0);
            classStats[student.classId].students.add(score.studentId);
          }
        });

        const classPerfData: ClassPerformance[] = Object.entries(classStats)
          .map(([classId, stats]) => {
            const average = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
            const passed = stats.scores.filter(s => s >= 40).length;
            const passRate = (passed / stats.scores.length) * 100;

            return {
              className: classes.get(classId) || 'Unknown',
              classId,
              average: Math.round(average),
              totalStudents: stats.students.size,
              topStudent: 'N/A', // Would need to calculate
              passRate: Math.round(passRate),
            };
          })
          .sort((a, b) => b.average - a.average);

        setClassPerformance(classPerfData);

        // Calculate student averages for top/bottom performers
        const studentAverages: { [key: string]: { scores: number[]; subjects: number } } = {};
        scores.forEach(score => {
          if (!studentAverages[score.studentId]) {
            studentAverages[score.studentId] = { scores: [], subjects: 0 };
          }
          studentAverages[score.studentId].scores.push(score.percentage || 0);
          studentAverages[score.studentId].subjects++;
        });

        const studentPerformances: TopPerformer[] = Object.entries(studentAverages)
          .map(([studentId, data]) => {
            const average = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            const student = students.get(studentId);
            return {
              studentId,
              studentName: student?.name || 'Unknown',
              className: classes.get(student?.classId || '') || 'Unknown',
              average: Math.round(average * 10) / 10,
              totalSubjects: data.subjects,
            };
          })
          .filter(p => p.totalSubjects >= 3); // At least 3 subjects

        setTopPerformers(
          studentPerformances.sort((a, b) => b.average - a.average).slice(0, 10)
        );
        setBottomPerformers(
          studentPerformances.sort((a, b) => a.average - b.average).slice(0, 10)
        );

        // Calculate subject difficulty
        const difficultyData: SubjectDifficulty[] = subjectPerfData.map(sp => ({
          subject: sp.subject,
          difficulty: sp.average, // Higher average = easier
          failRate: 100 - sp.passRate,
        })).sort((a, b) => a.difficulty - b.difficulty);

        setSubjectDifficulty(difficultyData);

        // Calculate overall stats
        const allScores = scores.map(s => s.percentage || 0);
        const schoolAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const totalPassed = allScores.filter(s => s >= 40).length;
        const overallPassRate = (totalPassed / allScores.length) * 100;

        setOverallStats({
          schoolAverage: Math.round(schoolAverage),
          totalStudents: students.size,
          totalSubjects: subjects.size,
          overallPassRate: Math.round(overallPassRate),
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading analytics data:', error);
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [user?.tenantId, selectedTerm]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Performance Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed subject and class analysis</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {terms.map(term => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">School Average</p>
            <p className={`text-2xl font-bold mt-1 ${
              overallStats.schoolAverage >= 75 ? 'text-green-600' :
              overallStats.schoolAverage >= 60 ? 'text-blue-600' :
              overallStats.schoolAverage >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallStats.schoolAverage}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Overall Pass Rate</p>
            <p className={`text-2xl font-bold mt-1 ${
              overallStats.overallPassRate >= 90 ? 'text-green-600' :
              overallStats.overallPassRate >= 70 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {overallStats.overallPassRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overallStats.totalStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Subjects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overallStats.totalSubjects}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
                <Bar dataKey="passRate" fill="#10b981" name="Pass Rate" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Class Performance & Subject Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {classPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="className" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#8b5cf6" name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject Difficulty Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectDifficulty.length > 0 ? (
              <div className="space-y-3">
                {subjectDifficulty.slice(0, 6).map((subject, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
                      <span className="text-sm text-gray-600">{subject.difficulty}% avg</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          subject.difficulty >= 70 ? 'bg-green-500' :
                          subject.difficulty >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${subject.difficulty}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {subject.failRate.toFixed(0)}% fail rate
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
              Top 10 Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-2">
                {topPerformers.map((student, index) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.studentName}</p>
                        <p className="text-xs text-gray-500">{student.className} • {student.totalSubjects} subjects</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{student.average}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
              Students Needing Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottomPerformers.length > 0 ? (
              <div className="space-y-2">
                {bottomPerformers.map((student, index) => (
                  <div key={student.studentId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.studentName}</p>
                        <p className="text-xs text-gray-500">{student.className} • {student.totalSubjects} subjects</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        student.average >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.average}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Subject Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Students</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Average</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Highest</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Lowest</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subjectPerformance.map((subject, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{subject.subject}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{subject.totalStudents}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-bold ${
                        subject.average >= 75 ? 'text-green-600' :
                        subject.average >= 60 ? 'text-blue-600' :
                        subject.average >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {subject.average}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{subject.highest}%</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{subject.lowest}%</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        subject.passRate >= 90 ? 'bg-green-100 text-green-800' :
                        subject.passRate >= 70 ? 'bg-blue-100 text-blue-800' :
                        subject.passRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {subject.passRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
