'use client';

/**
 * Teacher Analytics (Phase 22)
 * Teacher performance and workload analysis
 *
 * Features:
 * - Score entry completion rates
 * - Class performance by teacher
 * - Workload distribution
 * - Subject assignments
 * - Performance comparisons
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  email: string;
  totalClasses: number;
  totalSubjects: number;
  totalStudents: number;
  scoresEntered: number;
  scoresExpected: number;
  completionRate: number;
  averageClassPerformance: number;
  subjectsTaught: string[];
}

interface WorkloadData {
  teacherName: string;
  classes: number;
  students: number;
  subjects: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TeacherAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [terms, setTerms] = useState<Array<{ id: string; name: string }>>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTeachers: 0,
    averageCompletionRate: 0,
    teachersComplete: 0,
    teachersPending: 0,
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
    const loadTeacherAnalytics = async () => {
      if (!user?.tenantId || !selectedTerm) return;

      setLoading(true);
      try {
        // Load teachers
        const teachersQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'teacher'),
          where('isActive', '==', true)
        );
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachers = teachersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim(),
          email: doc.data().email,
        }));

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classes = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          teacherId: doc.data().teacherId,
          name: doc.data().name,
        }));

        // Load students
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const students = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          classId: doc.data().currentClassId,
        }));

        // Load subjects
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjects = new Map(
          subjectsSnapshot.docs.map(doc => [
            doc.id,
            { name: doc.data().name, teacherId: doc.data().teacherId },
          ])
        );

        // Load scores for selected term
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', user.tenantId),
          where('termId', '==', selectedTerm)
        );
        const scoresSnapshot = await getDocs(scoresQuery);
        const scores = scoresSnapshot.docs.map(doc => ({
          ...doc.data(),
          teacherId: subjects.get(doc.data().subjectId)?.teacherId,
        }));

        // Calculate teacher performance
        const teacherPerfData: TeacherPerformance[] = teachers.map(teacher => {
          // Classes taught by this teacher
          const teacherClasses = classes.filter(c => c.teacherId === teacher.id);
          const classIds = teacherClasses.map(c => c.id);

          // Students in teacher's classes
          const teacherStudents = students.filter(s => classIds.includes(s.classId));
          const studentIds = teacherStudents.map(s => s.id);

          // Subjects taught by this teacher
          const teacherSubjects = Array.from(subjects.entries())
            .filter(([_, subject]) => subject.teacherId === teacher.id)
            .map(([id, subject]) => ({ id, name: subject.name }));

          // Scores entered by this teacher
          const teacherScores = scores.filter(s => s.teacherId === teacher.id);

          // Expected scores = students × subjects
          const scoresExpected = studentIds.length * teacherSubjects.length;
          const scoresEntered = teacherScores.length;
          const completionRate = scoresExpected > 0 ? (scoresEntered / scoresExpected) * 100 : 0;

          // Average class performance
          const publishedScores = teacherScores.filter(s => s.isPublished);
          const averageClassPerformance = publishedScores.length > 0
            ? publishedScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / publishedScores.length
            : 0;

          return {
            teacherId: teacher.id,
            teacherName: teacher.name,
            email: teacher.email,
            totalClasses: teacherClasses.length,
            totalSubjects: teacherSubjects.length,
            totalStudents: studentIds.length,
            scoresEntered,
            scoresExpected,
            completionRate: Math.round(completionRate),
            averageClassPerformance: Math.round(averageClassPerformance),
            subjectsTaught: teacherSubjects.map(s => s.name),
          };
        });

        setTeacherPerformance(teacherPerfData);

        // Calculate workload data
        const workload: WorkloadData[] = teacherPerfData.map(t => ({
          teacherName: t.teacherName,
          classes: t.totalClasses,
          students: t.totalStudents,
          subjects: t.totalSubjects,
        })).sort((a, b) => b.students - a.students);

        setWorkloadData(workload);

        // Calculate overall stats
        const totalTeachers = teachers.length;
        const averageCompletionRate = teacherPerfData.length > 0
          ? teacherPerfData.reduce((sum, t) => sum + t.completionRate, 0) / teacherPerfData.length
          : 0;
        const teachersComplete = teacherPerfData.filter(t => t.completionRate === 100).length;
        const teachersPending = teacherPerfData.filter(t => t.completionRate < 100).length;

        setOverallStats({
          totalTeachers,
          averageCompletionRate: Math.round(averageCompletionRate),
          teachersComplete,
          teachersPending,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading teacher analytics:', error);
        setLoading(false);
      }
    };

    loadTeacherAnalytics();
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
          <h1 className="text-2xl font-bold text-gray-900">Teacher Analytics</h1>
          <p className="text-gray-600 mt-1">Performance and workload analysis</p>
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
            <p className="text-sm text-gray-600">Total Teachers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overallStats.totalTeachers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Avg Completion Rate</p>
            <p className={`text-2xl font-bold mt-1 ${
              overallStats.averageCompletionRate >= 90 ? 'text-green-600' :
              overallStats.averageCompletionRate >= 70 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {overallStats.averageCompletionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{overallStats.teachersComplete}</p>
            <p className="text-xs text-gray-500 mt-1">100% done</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{overallStats.teachersPending}</p>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Entry Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={teacherPerformance.slice().sort((a, b) => a.completionRate - b.completionRate)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="teacherName" angle={-45} textAnchor="end" height={120} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="completionRate" name="Completion Rate (%)" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Workload Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {workloadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="teacherName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#10b981" name="Students" />
                <Bar dataKey="classes" fill="#3b82f6" name="Classes" />
                <Bar dataKey="subjects" fill="#f59e0b" name="Subjects" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Teacher Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Teacher Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classes</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Students</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Subjects</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Scores Entered</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completion</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teacherPerformance.map((teacher, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{teacher.teacherName}</p>
                        <p className="text-xs text-gray-500">{teacher.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{teacher.totalClasses}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{teacher.totalStudents}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">{teacher.totalSubjects}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">
                      {teacher.scoresEntered} / {teacher.scoresExpected}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        teacher.completionRate === 100 ? 'bg-green-100 text-green-800' :
                        teacher.completionRate >= 70 ? 'bg-blue-100 text-blue-800' :
                        teacher.completionRate >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {teacher.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {teacher.averageClassPerformance > 0 ? (
                        <span className={`font-bold ${
                          teacher.averageClassPerformance >= 75 ? 'text-green-600' :
                          teacher.averageClassPerformance >= 60 ? 'text-blue-600' :
                          teacher.averageClassPerformance >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {teacher.averageClassPerformance}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
