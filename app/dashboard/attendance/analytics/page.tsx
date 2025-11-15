'use client';

/**
 * Attendance Analytics Dashboard (Phase 21+)
 * Advanced analytics with charts, trends, and predictions
 *
 * Features:
 * - Attendance trend charts
 * - Class comparison graphs
 * - Monthly/weekly breakdowns
 * - At-risk student identification
 * - Predictive analytics
 * - Export analytics reports
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  AttendanceRecord,
  ATTENDANCE_STATUS_CONFIG,
  getAttendanceCategory,
  getSchoolDays,
} from '@/lib/attendance/config';

interface DailyStats {
  date: Date;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

interface ClassStats {
  classId: string;
  className: string;
  totalStudents: number;
  averageRate: number;
  presentToday: number;
  absentToday: number;
  trend: 'up' | 'down' | 'stable';
}

interface AtRiskStudent {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  attendanceRate: number;
  absentDays: number;
  consecutiveAbsences: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export default function AttendanceAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'term' | 'year'>('month');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [overallStats, setOverallStats] = useState({
    averageRate: 0,
    totalDays: 0,
    trend: 0,
    bestClass: '',
    worstClass: '',
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user?.tenantId) return;

      try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();

        switch (dateRange) {
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case 'term':
            startDate.setDate(startDate.getDate() - 90);
            break;
          case 'year':
            startDate.setDate(startDate.getDate() - 365);
            break;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Load all attendance records
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const records = attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as AttendanceRecord[];

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classes = classesSnapshot.docs.map(doc => ({
          id: doc.id,
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
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          admissionNumber: doc.data().admissionNumber,
          currentClassId: doc.data().currentClassId,
        }));

        // Calculate daily stats
        const schoolDays = getSchoolDays(startDate, endDate);
        const dailyStatsData: DailyStats[] = schoolDays.map(day => {
          const dayRecords = records.filter(r =>
            r.date.toDateString() === day.toDateString()
          );

          const present = dayRecords.filter(r =>
            ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
          ).length;
          const absent = dayRecords.filter(r => r.status === 'absent').length;
          const late = dayRecords.filter(r => r.status === 'late').length;
          const total = dayRecords.length;
          const rate = total > 0 ? (present / total) * 100 : 0;

          return { date: day, present, absent, late, total, rate };
        });

        setDailyStats(dailyStatsData);

        // Calculate class stats
        const classStatsData: ClassStats[] = classes.map(cls => {
          const classStudents = students.filter(s => s.currentClassId === cls.id);
          const classRecords = records.filter(r => r.classId === cls.id);

          const presentCount = classRecords.filter(r =>
            ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
          ).length;
          const averageRate = classRecords.length > 0
            ? (presentCount / classRecords.length) * 100
            : 0;

          // Today's stats
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayRecords = classRecords.filter(r =>
            r.date.toDateString() === today.toDateString()
          );
          const presentToday = todayRecords.filter(r =>
            ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
          ).length;
          const absentToday = todayRecords.filter(r => r.status === 'absent').length;

          // Calculate trend (compare last 7 days to previous 7 days)
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          const previousWeek = new Date();
          previousWeek.setDate(previousWeek.getDate() - 14);

          const lastWeekRecords = classRecords.filter(r =>
            r.date >= lastWeek && r.date <= today
          );
          const prevWeekRecords = classRecords.filter(r =>
            r.date >= previousWeek && r.date < lastWeek
          );

          const lastWeekRate = lastWeekRecords.length > 0
            ? (lastWeekRecords.filter(r => ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent).length / lastWeekRecords.length) * 100
            : 0;
          const prevWeekRate = prevWeekRecords.length > 0
            ? (prevWeekRecords.filter(r => ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent).length / prevWeekRecords.length) * 100
            : 0;

          const trend = lastWeekRate > prevWeekRate + 2 ? 'up' :
                       lastWeekRate < prevWeekRate - 2 ? 'down' : 'stable';

          return {
            classId: cls.id,
            className: cls.name,
            totalStudents: classStudents.length,
            averageRate,
            presentToday,
            absentToday,
            trend,
          };
        });

        setClassStats(classStatsData);

        // Identify at-risk students
        const atRiskData: AtRiskStudent[] = [];
        for (const student of students) {
          const studentRecords = records.filter(r => r.studentId === student.id);

          if (studentRecords.length === 0) continue;

          const presentDays = studentRecords.filter(r =>
            ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
          ).length;
          const absentDays = studentRecords.filter(r => r.status === 'absent').length;
          const attendanceRate = (presentDays / studentRecords.length) * 100;

          // Check consecutive absences
          const sortedRecords = [...studentRecords].sort((a, b) =>
            b.date.getTime() - a.date.getTime()
          );
          let consecutiveAbsences = 0;
          for (const record of sortedRecords.slice(0, 10)) {
            if (record.status === 'absent') {
              consecutiveAbsences++;
            } else if (ATTENDANCE_STATUS_CONFIG[record.status].countsAsPresent) {
              break;
            }
          }

          // Determine risk level
          let riskLevel: 'high' | 'medium' | 'low' = 'low';
          if (attendanceRate < 80 || consecutiveAbsences >= 5) {
            riskLevel = 'high';
          } else if (attendanceRate < 90 || consecutiveAbsences >= 3) {
            riskLevel = 'medium';
          }

          if (riskLevel !== 'low') {
            const cls = classes.find(c => c.id === student.currentClassId);
            atRiskData.push({
              id: student.id,
              name: `${student.firstName} ${student.lastName}`,
              admissionNumber: student.admissionNumber,
              className: cls?.name || 'Unknown',
              attendanceRate,
              absentDays,
              consecutiveAbsences,
              riskLevel,
            });
          }
        }

        // Sort by risk level and rate
        atRiskData.sort((a, b) => {
          const riskOrder = { high: 0, medium: 1, low: 2 };
          if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
            return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
          }
          return a.attendanceRate - b.attendanceRate;
        });

        setAtRiskStudents(atRiskData);

        // Calculate overall stats
        const totalRate = classStatsData.reduce((sum, c) => sum + c.averageRate, 0);
        const avgRate = classStatsData.length > 0 ? totalRate / classStatsData.length : 0;

        const bestClass = classStatsData.reduce((best, current) =>
          current.averageRate > best.averageRate ? current : best
        , classStatsData[0] || { averageRate: 0, className: '' });

        const worstClass = classStatsData.reduce((worst, current) =>
          current.averageRate < worst.averageRate ? current : worst
        , classStatsData[0] || { averageRate: 0, className: '' });

        // Calculate trend (compare first half to second half of period)
        const midPoint = Math.floor(dailyStatsData.length / 2);
        const firstHalf = dailyStatsData.slice(0, midPoint);
        const secondHalf = dailyStatsData.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.rate, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.rate, 0) / secondHalf.length;
        const trend = secondHalfAvg - firstHalfAvg;

        setOverallStats({
          averageRate: avgRate,
          totalDays: schoolDays.length,
          trend,
          bestClass: bestClass?.className || 'N/A',
          worstClass: worstClass?.className || 'N/A',
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user?.tenantId, dateRange]);

  const handleExportReport = () => {
    // Generate comprehensive CSV report
    const sections = [];

    // Overall stats section
    sections.push('OVERALL STATISTICS');
    sections.push(`Period,${dateRange}`);
    sections.push(`Average Attendance Rate,${overallStats.averageRate.toFixed(2)}%`);
    sections.push(`Total School Days,${overallStats.totalDays}`);
    sections.push(`Trend,${overallStats.trend > 0 ? '+' : ''}${overallStats.trend.toFixed(2)}%`);
    sections.push(`Best Performing Class,${overallStats.bestClass}`);
    sections.push(`Class Needing Support,${overallStats.worstClass}`);
    sections.push('');

    // Daily stats section
    sections.push('DAILY ATTENDANCE TRENDS');
    sections.push('Date,Present,Absent,Late,Total,Rate (%)');
    dailyStats.forEach(day => {
      sections.push(`${day.date.toLocaleDateString()},${day.present},${day.absent},${day.late},${day.total},${day.rate.toFixed(2)}`);
    });
    sections.push('');

    // Class stats section
    sections.push('CLASS PERFORMANCE');
    sections.push('Class Name,Total Students,Average Rate (%),Present Today,Absent Today,Trend');
    classStats.forEach(cls => {
      sections.push(`${cls.className},${cls.totalStudents},${cls.averageRate.toFixed(2)},${cls.presentToday},${cls.absentToday},${cls.trend}`);
    });
    sections.push('');

    // At-risk students section
    sections.push('AT-RISK STUDENTS');
    sections.push('Name,Admission Number,Class,Attendance Rate (%),Absent Days,Consecutive Absences,Risk Level');
    atRiskStudents.forEach(student => {
      sections.push(`${student.name},${student.admissionNumber},${student.className},${student.attendanceRate.toFixed(2)},${student.absentDays},${student.consecutiveAbsences},${student.riskLevel}`);
    });

    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
          <p className="text-gray-600 mt-1">Trends, insights, and predictions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <div className="flex gap-2">
              {(['week', 'month', 'term', 'year'] as const).map(range => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  onClick={() => setDateRange(range)}
                  className="capitalize"
                >
                  {range === 'term' ? 'Term (90 days)' : range}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Average Attendance</p>
              <p className={`text-2xl font-bold mt-1 ${getAttendanceCategory(overallStats.averageRate).color}`}>
                {overallStats.averageRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getAttendanceCategory(overallStats.averageRate).label}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Attendance Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {overallStats.trend > 0 ? (
                  <TrendingUpIcon className="h-6 w-6 text-green-600" />
                ) : overallStats.trend < 0 ? (
                  <TrendingDownIcon className="h-6 w-6 text-red-600" />
                ) : (
                  <ChartBarIcon className="h-6 w-6 text-gray-600" />
                )}
                <p className={`text-2xl font-bold ${
                  overallStats.trend > 0 ? 'text-green-600' :
                  overallStats.trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {overallStats.trend > 0 ? '+' : ''}{overallStats.trend.toFixed(1)}%
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {overallStats.trend > 0 ? 'Improving' : overallStats.trend < 0 ? 'Declining' : 'Stable'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">School Days</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{overallStats.totalDays}</p>
              <p className="text-xs text-gray-500 mt-1">In selected period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">At-Risk Students</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{atRiskStudents.length}</p>
              <p className="text-xs text-gray-500 mt-1">Need intervention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Attendance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyStats.slice(-30).map((day, index) => {
              const category = getAttendanceCategory(day.rate);
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-xs text-gray-600">
                    {day.date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className={`h-6 rounded-full transition-all ${
                            day.rate >= 95 ? 'bg-green-600' :
                            day.rate >= 90 ? 'bg-blue-600' :
                            day.rate >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${day.rate}%` }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                            {day.rate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-32 text-xs text-gray-600">
                        P: {day.present} | A: {day.absent} | L: {day.late}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Class Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Class Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classStats.sort((a, b) => b.averageRate - a.averageRate).map(cls => {
              const category = getAttendanceCategory(cls.averageRate);
              return (
                <div key={cls.classId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.className}</h3>
                      <p className="text-xs text-gray-600">{cls.totalStudents} students</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cls.trend === 'up' && <TrendingUpIcon className="h-5 w-5 text-green-600" />}
                      {cls.trend === 'down' && <TrendingDownIcon className="h-5 w-5 text-red-600" />}
                      <span className={`text-lg font-bold ${category.color}`}>
                        {cls.averageRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        cls.averageRate >= 95 ? 'bg-green-600' :
                        cls.averageRate >= 90 ? 'bg-blue-600' :
                        cls.averageRate >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${cls.averageRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                    <span>Today: {cls.presentToday} present, {cls.absentToday} absent</span>
                    <span className="capitalize">{cls.trend} trend</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      {atRiskStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              At-Risk Students Requiring Intervention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Attendance Rate
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Absent Days
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Consecutive Absences
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Risk Level
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {atRiskStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.admissionNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap text-sm text-gray-900">
                        {student.className}
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`font-bold ${getAttendanceCategory(student.attendanceRate).color}`}>
                          {student.attendanceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {student.absentDays}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          {student.consecutiveAbsences}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          student.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                          student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {student.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/attendance/student/${student.id}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overallStats.trend > 2 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUpIcon className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Positive Trend Detected</h3>
                    <p className="text-sm text-green-700">
                      Attendance has improved by {overallStats.trend.toFixed(1)}% in this period.
                      Continue current strategies and consider sharing best practices across classes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {overallStats.trend < -2 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingDownIcon className="h-6 w-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Declining Attendance Alert</h3>
                    <p className="text-sm text-red-700">
                      Attendance has declined by {Math.abs(overallStats.trend).toFixed(1)}% in this period.
                      Consider investigating causes and implementing intervention strategies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {atRiskStudents.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">Students Need Support</h3>
                    <p className="text-sm text-yellow-700">
                      {atRiskStudents.length} student{atRiskStudents.length > 1 ? 's' : ''} identified as at-risk.
                      Schedule parent meetings, review individual circumstances, and provide targeted support.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {overallStats.bestClass !== overallStats.worstClass && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <ChartBarIcon className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Performance Variation</h3>
                    <p className="text-sm text-blue-700">
                      {overallStats.bestClass} is performing best while {overallStats.worstClass} needs support.
                      Consider peer mentoring between classes and identify successful strategies to replicate.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
