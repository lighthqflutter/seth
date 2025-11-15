'use client';

/**
 * Analytics Dashboard (Phase 22)
 * Executive overview with key metrics and insights
 *
 * Features:
 * - School-wide statistics
 * - Performance overview
 * - Recent activity feed
 * - Quick insights
 * - Navigation to detailed analytics
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AcademicCapIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  activeTerms: number;
  averageClassSize: number;
  studentsWithResults: number;
  resultsPublished: number;
  attendanceRate: number;
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type: 'result_published' | 'student_added' | 'score_entered' | 'attendance_marked';
  message: string;
  timestamp: Date;
  user?: string;
}

interface PerformanceData {
  subject: string;
  average: number;
  passRate: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    activeTerms: 0,
    averageClassSize: 0,
    studentsWithResults: 0,
    resultsPublished: 0,
    attendanceRate: 0,
    recentActivity: [],
  });
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load students
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Load teachers
        const teachersQuery = query(
          collection(db, 'users'),
          where('tenantId', '==', user.tenantId),
          where('role', '==', 'teacher'),
          where('isActive', '==', true)
        );
        const teachersSnapshot = await getDocs(teachersQuery);

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
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

        // Load terms
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const termsSnapshot = await getDocs(termsQuery);

        // Load scores for current term
        const currentTerm = termsSnapshot.docs[0]?.id;
        let scoresData: any[] = [];
        let gradeCount: { [key: string]: number } = {};
        let subjectPerformance: { [key: string]: { total: number; count: number; passed: number } } = {};

        if (currentTerm) {
          const scoresQuery = query(
            collection(db, 'scores'),
            where('tenantId', '==', user.tenantId),
            where('termId', '==', currentTerm),
            where('isPublished', '==', true)
          );
          const scoresSnapshot = await getDocs(scoresQuery);
          scoresData = scoresSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Calculate grade distribution
          scoresData.forEach(score => {
            const grade = score.grade || 'F9';
            gradeCount[grade] = (gradeCount[grade] || 0) + 1;

            // Calculate subject performance
            if (score.subjectId) {
              if (!subjectPerformance[score.subjectId]) {
                subjectPerformance[score.subjectId] = { total: 0, count: 0, passed: 0 };
              }
              subjectPerformance[score.subjectId].total += score.percentage || 0;
              subjectPerformance[score.subjectId].count += 1;
              if (score.percentage >= 40) {
                subjectPerformance[score.subjectId].passed += 1;
              }
            }
          });
        }

        // Load attendance data
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('date', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = attendanceSnapshot.docs.map(doc => doc.data());

        const totalAttendance = attendanceData.length;
        const presentCount = attendanceData.filter(a =>
          ['present', 'late'].includes(a.status)
        ).length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        // Calculate average class size
        const totalClassStudents = studentsData.length;
        const averageClassSize = classesData.length > 0
          ? Math.round(totalClassStudents / classesData.length)
          : 0;

        // Load recent activity
        const auditQuery = query(
          collection(db, 'auditLogs'),
          where('tenantId', '==', user.tenantId),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const auditSnapshot = await getDocs(auditQuery);
        const recentActivity: Activity[] = auditSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.action as any,
            message: data.description || data.action,
            timestamp: data.timestamp.toDate(),
            user: data.userName,
          };
        });

        // Calculate performance data
        const performanceDataArray: PerformanceData[] = await Promise.all(
          Object.entries(subjectPerformance).slice(0, 6).map(async ([subjectId, perf]) => {
            const subjectDoc = await getDocs(
              query(collection(db, 'subjects'), where('__name__', '==', subjectId))
            );
            const subjectName = subjectDoc.docs[0]?.data().name || 'Unknown';

            return {
              subject: subjectName,
              average: perf.count > 0 ? Math.round(perf.total / perf.count) : 0,
              passRate: perf.count > 0 ? Math.round((perf.passed / perf.count) * 100) : 0,
            };
          })
        );

        // Calculate grade distribution
        const totalGrades = Object.values(gradeCount).reduce((sum, count) => sum + count, 0);
        const gradeDistributionData: GradeDistribution[] = Object.entries(gradeCount)
          .map(([grade, count]) => ({
            grade,
            count,
            percentage: totalGrades > 0 ? Math.round((count / totalGrades) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Generate insights
        const generatedInsights: string[] = [];

        if (studentsData.length > 0) {
          const studentsWithScores = new Set(scoresData.map(s => s.studentId)).size;
          const coverageRate = (studentsWithScores / studentsData.length) * 100;
          if (coverageRate < 50) {
            generatedInsights.push(`Only ${coverageRate.toFixed(0)}% of students have published results`);
          }
        }

        if (attendanceRate < 90) {
          generatedInsights.push(`Attendance rate is ${attendanceRate.toFixed(1)}% - below 90% target`);
        } else if (attendanceRate >= 95) {
          generatedInsights.push(`Excellent attendance rate: ${attendanceRate.toFixed(1)}%`);
        }

        if (performanceDataArray.length > 0) {
          const lowestPerforming = performanceDataArray.reduce((min, p) =>
            p.average < min.average ? p : min
          );
          if (lowestPerforming.average < 50) {
            generatedInsights.push(`${lowestPerforming.subject} needs attention (${lowestPerforming.average}% average)`);
          }
        }

        if (averageClassSize > 40) {
          generatedInsights.push(`Large class sizes detected (avg: ${averageClassSize} students)`);
        }

        setStats({
          totalStudents: studentsData.length,
          totalTeachers: teachersSnapshot.docs.length,
          totalClasses: classesData.length,
          totalSubjects: subjectsSnapshot.docs.length,
          activeTerms: termsSnapshot.docs.length,
          averageClassSize,
          studentsWithResults: new Set(scoresData.map(s => s.studentId)).size,
          resultsPublished: scoresData.length,
          attendanceRate,
          recentActivity,
        });

        setPerformanceData(performanceDataArray);
        setGradeDistribution(gradeDistributionData);
        setInsights(generatedInsights);

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.tenantId]);

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
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">School-wide insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {stats.averageClassSize} per class
                </p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Teachers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTeachers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalClasses} classes
                </p>
              </div>
              <UsersIcon className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Results Published</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.resultsPublished}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.studentsWithResults} students
                </p>
              </div>
              <AcademicCapIcon className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className={`text-2xl font-bold mt-1 ${
                  stats.attendanceRate >= 95 ? 'text-green-600' :
                  stats.attendanceRate >= 90 ? 'text-blue-600' :
                  stats.attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.attendanceRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
              <CalendarIcon className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <TrendingDownIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#3b82f6" name="Average Score (%)" />
                  <Bar dataKey="passRate" fill="#10b981" name="Pass Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No grade data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/analytics/academic')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Academic Analytics</h3>
                <p className="text-sm text-gray-600">Detailed subject and class performance</p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/analytics/teachers')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Teacher Analytics</h3>
                <p className="text-sm text-gray-600">Teacher performance and workload</p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/analytics/students')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Student Analytics</h3>
                <p className="text-sm text-gray-600">Individual performance and trends</p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp.toLocaleString()} {activity.user && `• ${activity.user}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
