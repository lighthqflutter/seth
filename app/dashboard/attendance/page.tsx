'use client';

/**
 * Attendance Dashboard (Phase 21)
 * Main landing page for attendance module
 *
 * Features:
 * - Quick stats overview
 * - Recent attendance summary
 * - Quick access to mark attendance
 * - Class attendance overview
 * - Alerts and notifications
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
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  ClassAttendanceSummary,
  ATTENDANCE_STATUS_CONFIG,
  getAttendanceCategory,
} from '@/lib/attendance/config';

interface ClassWithStats {
  id: string;
  name: string;
  totalStudents: number;
  markedToday: boolean;
  todayStats?: {
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  };
  weeklyAttendanceRate: number;
}

export default function AttendanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [isSchoolDay, setIsSchoolDay] = useState(false);
  const [schoolDayMessage, setSchoolDayMessage] = useState('');
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    classesMarkedToday: 0,
    totalClasses: 0,
    averageAttendanceRate: 0,
    studentsAbsentToday: 0,
    studentsLateToday: 0,
  });
  const [alerts, setAlerts] = useState<Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Check if today is a school day (Monday-Friday within active term)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

        // Load active term
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const termsSnapshot = await getDocs(termsQuery);

        let currentTerm = null;
        let isWithinTermDates = false;

        if (!termsSnapshot.empty) {
          const termData = termsSnapshot.docs[0].data();
          currentTerm = {
            id: termsSnapshot.docs[0].id,
            name: termData.name,
            startDate: termData.startDate,
            endDate: termData.endDate,
            isActive: termData.isActive,
            holidays: termData.holidays || [],
          };
          setActiveTerm(currentTerm);

          // Check if today is within term dates
          const termStart = currentTerm.startDate?.toDate();
          const termEnd = currentTerm.endDate?.toDate();

          if (termStart && termEnd) {
            const todayMidnight = new Date(today);
            todayMidnight.setHours(0, 0, 0, 0);
            isWithinTermDates = todayMidnight >= termStart && todayMidnight <= termEnd;
          }
        }

        // Check if today is a holiday
        let isHoliday = false;
        let holidayName = '';
        if (currentTerm && currentTerm.holidays && Array.isArray(currentTerm.holidays)) {
          for (const holiday of currentTerm.holidays) {
            const holidayStart = holiday.startDate?.toDate();
            const holidayEnd = holiday.endDate?.toDate();
            if (holidayStart && holidayEnd) {
              const todayMidnight = new Date(today);
              todayMidnight.setHours(0, 0, 0, 0);
              if (todayMidnight >= holidayStart && todayMidnight <= holidayEnd) {
                isHoliday = true;
                holidayName = holiday.name;
                break;
              }
            }
          }
        }

        // Determine if it's a valid school day
        const isValidSchoolDay = isWeekday && (isWithinTermDates || !currentTerm) && !isHoliday;
        setIsSchoolDay(isValidSchoolDay);

        // Set appropriate message
        if (!isWeekday) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          setSchoolDayMessage(`Today is ${dayNames[dayOfWeek]}. Attendance can only be marked Monday through Friday.`);
        } else if (isHoliday) {
          setSchoolDayMessage(`Today is a holiday: ${holidayName}. Attendance cannot be marked on holidays.`);
        } else if (currentTerm && !isWithinTermDates) {
          setSchoolDayMessage(`Today is outside the active term dates (${currentTerm.name}: ${currentTerm.startDate?.toDate().toLocaleDateString()} - ${currentTerm.endDate?.toDate().toLocaleDateString()}).`);
        } else if (!currentTerm) {
          setSchoolDayMessage('No active term found. Please create and activate a term first.');
        }

        // Load all classes (filter for active in-memory if needed)
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );

        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs
          .filter(doc => doc.data().isActive !== false) // Treat undefined/null as active
          .map(doc => ({
            id: doc.id,
            name: doc.data().name,
          }));

        // Load students count per class
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs
          .filter(doc => doc.data().isActive !== false) // Treat undefined/null as active
          .map(doc => ({
            id: doc.id,
            currentClassId: doc.data().currentClassId,
          }));

        // Today's attendance
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAttendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('date', '>=', Timestamp.fromDate(todayStart)),
          where('date', '<=', Timestamp.fromDate(todayEnd))
        );

        const todayAttendanceSnapshot = await getDocs(todayAttendanceQuery);
        const todayAttendance = todayAttendanceSnapshot.docs.map(doc => ({
          classId: doc.data().classId,
          status: doc.data().status,
          studentId: doc.data().studentId,
        }));

        // Last 7 days attendance for weekly rate
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const weekAttendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('date', '>=', Timestamp.fromDate(weekAgo))
        );

        const weekAttendanceSnapshot = await getDocs(weekAttendanceQuery);
        const weekAttendance = weekAttendanceSnapshot.docs.map(doc => ({
          classId: doc.data().classId,
          status: doc.data().status,
        }));

        // Calculate stats for each class
        const classesWithStats: ClassWithStats[] = classesData.map(cls => {
          const classStudents = studentsData.filter(s => s.currentClassId === cls.id);
          const totalStudents = classStudents.length;

          const classTodayAttendance = todayAttendance.filter(a => a.classId === cls.id);
          const markedToday = classTodayAttendance.length > 0;

          let todayStats;
          if (markedToday) {
            const present = classTodayAttendance.filter(a =>
              ATTENDANCE_STATUS_CONFIG[a.status as keyof typeof ATTENDANCE_STATUS_CONFIG]?.countsAsPresent
            ).length;
            const absent = classTodayAttendance.filter(a => a.status === 'absent').length;
            const late = classTodayAttendance.filter(a => a.status === 'late').length;
            const attendanceRate = totalStudents > 0 ? (present / totalStudents) * 100 : 0;

            todayStats = { present, absent, late, attendanceRate };
          }

          const classWeekAttendance = weekAttendance.filter(a => a.classId === cls.id);
          const weekPresent = classWeekAttendance.filter(a =>
            ATTENDANCE_STATUS_CONFIG[a.status as keyof typeof ATTENDANCE_STATUS_CONFIG]?.countsAsPresent
          ).length;
          const weeklyAttendanceRate = classWeekAttendance.length > 0
            ? (weekPresent / classWeekAttendance.length) * 100
            : 0;

          return {
            id: cls.id,
            name: cls.name,
            totalStudents,
            markedToday,
            todayStats,
            weeklyAttendanceRate,
          };
        });

        setClasses(classesWithStats);

        // Calculate overall stats
        const totalStudents = studentsData.length;
        const classesMarkedToday = classesWithStats.filter(c => c.markedToday).length;
        const totalClasses = classesData.length;

        const todayPresent = todayAttendance.filter(a =>
          ATTENDANCE_STATUS_CONFIG[a.status as keyof typeof ATTENDANCE_STATUS_CONFIG].countsAsPresent
        ).length;
        const averageAttendanceRate = todayAttendance.length > 0
          ? (todayPresent / todayAttendance.length) * 100
          : 0;

        const studentsAbsentToday = todayAttendance.filter(a => a.status === 'absent').length;
        const studentsLateToday = todayAttendance.filter(a => a.status === 'late').length;

        setStats({
          totalStudents,
          classesMarkedToday,
          totalClasses,
          averageAttendanceRate,
          studentsAbsentToday,
          studentsLateToday,
        });

        // Generate alerts
        const generatedAlerts = [];

        // Alert if classes not marked today
        const unmarkedClasses = classesWithStats.filter(c => !c.markedToday);
        if (unmarkedClasses.length > 0) {
          generatedAlerts.push({
            type: 'unmarked_classes',
            message: `${unmarkedClasses.length} class${unmarkedClasses.length > 1 ? 'es' : ''} not marked today`,
            severity: 'medium' as const,
          });
        }

        // Alert if high absenteeism
        if (studentsAbsentToday > totalStudents * 0.1) {
          generatedAlerts.push({
            type: 'high_absence',
            message: `${studentsAbsentToday} students absent today (${((studentsAbsentToday / totalStudents) * 100).toFixed(1)}%)`,
            severity: 'high' as const,
          });
        }

        setAlerts(generatedAlerts);
        setLoading(false);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setLoading(false);
      }
    };

    loadData();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 mt-1">Track and monitor student attendance</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/attendance/mark')}
          disabled={!isSchoolDay}
          title={!isSchoolDay ? schoolDayMessage : 'Mark attendance for today'}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Mark Attendance
        </Button>
      </div>

      {/* School Day Alert */}
      {!isSchoolDay && schoolDayMessage && (
        <Card className="border-l-4 border-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Not a School Day</p>
                <p className="text-sm text-blue-700 mt-1">{schoolDayMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.severity === 'high' ? 'border-red-500 bg-red-50' :
              alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className={`h-6 w-6 ${
                    alert.severity === 'high' ? 'text-red-600' :
                    alert.severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <p className="text-sm text-gray-700">{alert.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Classes Marked Today</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {stats.classesMarkedToday}/{stats.totalClasses}
                </p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Attendance Today</p>
                <p className={`text-2xl font-bold mt-1 ${getAttendanceCategory(stats.averageAttendanceRate).color}`}>
                  {stats.averageAttendanceRate.toFixed(1)}%
                </p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absent Today</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.studentsAbsentToday}</p>
                {stats.studentsLateToday > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">{stats.studentsLateToday} late</p>
                )}
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Classes Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No classes found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(cls => (
                <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                        <p className="text-sm text-gray-600">{cls.totalStudents} students</p>
                      </div>
                      {cls.markedToday ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Marked
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Not Marked
                        </span>
                      )}
                    </div>

                    {cls.todayStats && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-gray-600">Present</p>
                            <p className="text-sm font-bold text-green-600">{cls.todayStats.present}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Absent</p>
                            <p className="text-sm font-bold text-red-600">{cls.todayStats.absent}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Late</p>
                            <p className="text-sm font-bold text-yellow-600">{cls.todayStats.late}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Weekly Average</span>
                        <span className={getAttendanceCategory(cls.weeklyAttendanceRate).color}>
                          {cls.weeklyAttendanceRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${cls.weeklyAttendanceRate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/attendance/mark?classId=${cls.id}`)}
                        disabled={!isSchoolDay}
                        title={!isSchoolDay ? 'Attendance can only be marked on school days' : 'Mark attendance for today'}
                      >
                        Mark Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/attendance/class/${cls.id}`)}
                      >
                        View Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/attendance/mark')}
              disabled={!isSchoolDay}
            >
              <CalendarIcon className="h-6 w-6 mb-2" />
              Mark Attendance
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => router.push('/dashboard/attendance/analytics')}
            >
              <ChartBarIcon className="h-6 w-6 mb-2" />
              View Analytics
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => {
                // Export functionality
                alert('Export feature coming soon!');
              }}
            >
              <ClockIcon className="h-6 w-6 mb-2" />
              Export Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
