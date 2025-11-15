'use client';

/**
 * Student Attendance History (Phase 21)
 * View detailed attendance history for a specific student
 *
 * Features:
 * - Attendance calendar view
 * - Statistics and trends
 * - Alerts for chronic absence
 * - Monthly breakdown
 * - Export capability
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  AttendanceRecord,
  AttendanceStats,
  AttendanceAlert,
  ATTENDANCE_STATUS_CONFIG,
  calculateAttendanceRate,
  detectAttendanceAlerts,
  getAttendanceCategory,
  formatAttendanceDate,
} from '@/lib/attendance/config';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  className?: string;
}

export default function StudentAttendanceHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    excusedDays: 0,
    attendanceRate: 0,
  });
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !studentId) return;

      try {
        // Load student info
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists() || studentDoc.data().tenantId !== user.tenantId) {
          router.push('/dashboard/attendance');
          return;
        }

        const studentData = {
          id: studentDoc.id,
          ...studentDoc.data(),
        } as Student;

        // Load class name
        if (studentData.currentClassId) {
          const classDoc = await getDoc(doc(db, 'classes', studentData.currentClassId));
          if (classDoc.exists()) {
            studentData.className = classDoc.data().name;
          }
        }

        setStudent(studentData);

        // Load attendance records
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('studentId', '==', studentId),
          orderBy('date', 'desc')
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
          markedAt: doc.data().markedAt.toDate(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        })) as AttendanceRecord[];

        setRecords(attendanceData);

        // Calculate statistics
        const totalDays = attendanceData.length;
        const presentDays = attendanceData.filter(r =>
          ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
        ).length;
        const absentDays = attendanceData.filter(r =>
          r.status === 'absent'
        ).length;
        const lateDays = attendanceData.filter(r =>
          r.status === 'late'
        ).length;
        const excusedDays = attendanceData.filter(r =>
          ['excused', 'sick', 'permission'].includes(r.status)
        ).length;

        const calculatedStats: AttendanceStats = {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          excusedDays,
          attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        };

        setStats(calculatedStats);

        // Detect alerts
        const detectedAlerts = detectAttendanceAlerts(calculatedStats, attendanceData.slice(0, 30));
        setAlerts(detectedAlerts);

        setLoading(false);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, studentId, router]);

  // Filter records by selected month
  const monthRecords = records.filter(record => {
    const recordMonth = record.date.toISOString().slice(0, 7);
    return recordMonth === selectedMonth;
  });

  const category = getAttendanceCategory(stats.attendanceRate);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Student not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-gray-600 mt-1">
            {student.admissionNumber} • {student.className}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

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
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {alert.type === 'chronic_absence' && 'Chronic Absence Alert'}
                      {alert.type === 'consecutive_absence' && 'Consecutive Absences'}
                      {alert.type === 'late_pattern' && 'Late Arrival Pattern'}
                    </h3>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className={`text-2xl font-bold mt-1 ${category.color}`}>
                {category.icon} {stats.attendanceRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{category.label}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Total Days</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDays}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.presentDays}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.absentDays}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.lateDays}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Selector and Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance History</CardTitle>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={new Date().toISOString().slice(0, 7)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthRecords.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No attendance records for this month</p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthRecords.map(record => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {record.date.toLocaleDateString('en-NG', { weekday: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-gray-700">
                        {record.date.getDate()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.date.toLocaleDateString('en-NG', { month: 'short' })}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ATTENDANCE_STATUS_CONFIG[record.status].color}`}>
                          {ATTENDANCE_STATUS_CONFIG[record.status].icon} {ATTENDANCE_STATUS_CONFIG[record.status].label}
                        </span>
                        {record.period !== 'full_day' && (
                          <span className="text-xs text-gray-500 capitalize">
                            ({record.period.replace('_', ' ')})
                          </span>
                        )}
                      </div>

                      {record.reason && (
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {record.reason}
                        </p>
                      )}

                      {record.notes && (
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {record.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    Marked: {record.markedAt.toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(ATTENDANCE_STATUS_CONFIG).map(([status, config]) => {
              const count = records.filter(r => r.status === status).length;
              const percentage = stats.totalDays > 0 ? (count / stats.totalDays) * 100 : 0;

              return (
                <div key={status} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
