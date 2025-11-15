'use client';

/**
 * Class Attendance Report (Phase 21)
 * View attendance summary and trends for entire class
 *
 * Features:
 * - Class attendance overview
 * - Date range selection
 * - Student-wise breakdown
 * - Attendance trends chart
 * - Export to Excel
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
} from '@heroicons/react/24/outline';
import {
  AttendanceRecord,
  AttendanceStats,
  ATTENDANCE_STATUS_CONFIG,
  getAttendanceCategory,
  getSchoolDays,
} from '@/lib/attendance/config';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface StudentAttendance {
  student: Student;
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

export default function ClassAttendanceReportPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const classId = params.classId as string;

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Overall class stats
  const [classStats, setClassStats] = useState({
    totalStudents: 0,
    averageAttendanceRate: 0,
    totalSchoolDays: 0,
    studentsAboveThreshold: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !classId) return;

      try {
        // Load class info
        const classDoc = await getDoc(doc(db, 'classes', classId));
        if (!classDoc.exists() || classDoc.data().tenantId !== user.tenantId) {
          router.push('/dashboard/attendance');
          return;
        }

        setClassName(classDoc.data().name);

        // Load students
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', classId),
          where('isActive', '==', true)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          admissionNumber: doc.data().admissionNumber,
        })) as Student[];

        // Load attendance records for date range
        const dateStart = new Date(startDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(endDate);
        dateEnd.setHours(23, 59, 59, 999);

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('classId', '==', classId),
          where('date', '>=', Timestamp.fromDate(dateStart)),
          where('date', '<=', Timestamp.fromDate(dateEnd))
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

        // Calculate stats for each student
        const studentAttendanceData: StudentAttendance[] = studentsData.map(student => {
          const studentRecords = attendanceData.filter(r => r.studentId === student.id);

          const totalDays = studentRecords.length;
          const presentDays = studentRecords.filter(r =>
            ATTENDANCE_STATUS_CONFIG[r.status].countsAsPresent
          ).length;
          const absentDays = studentRecords.filter(r => r.status === 'absent').length;
          const lateDays = studentRecords.filter(r => r.status === 'late').length;
          const excusedDays = studentRecords.filter(r =>
            ['excused', 'sick', 'permission'].includes(r.status)
          ).length;

          const stats: AttendanceStats = {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            excusedDays,
            attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
          };

          return {
            student,
            stats,
            records: studentRecords,
          };
        });

        // Sort by attendance rate (lowest first to highlight issues)
        studentAttendanceData.sort((a, b) => a.stats.attendanceRate - b.stats.attendanceRate);

        setStudentAttendance(studentAttendanceData);

        // Calculate class-wide stats
        const totalStudents = studentsData.length;
        const averageAttendanceRate = totalStudents > 0
          ? studentAttendanceData.reduce((sum, sa) => sum + sa.stats.attendanceRate, 0) / totalStudents
          : 0;
        const totalSchoolDays = getSchoolDays(dateStart, dateEnd).length;
        const studentsAboveThreshold = studentAttendanceData.filter(
          sa => sa.stats.attendanceRate >= 90
        ).length;

        setClassStats({
          totalStudents,
          averageAttendanceRate,
          totalSchoolDays,
          studentsAboveThreshold,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, classId, startDate, endDate, router]);

  const handleExportCSV = () => {
    // CSV export logic
    const headers = ['Student Name', 'Admission Number', 'Total Days', 'Present', 'Absent', 'Late', 'Excused', 'Attendance Rate (%)'];
    const rows = studentAttendance.map(sa => [
      `${sa.student.firstName} ${sa.student.lastName}`,
      sa.student.admissionNumber,
      sa.stats.totalDays,
      sa.stats.presentDays,
      sa.stats.absentDays,
      sa.stats.lateDays,
      sa.stats.excusedDays,
      sa.stats.attendanceRate.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${className}_Attendance_Report_${startDate}_to_${endDate}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">{className} Attendance Report</h1>
          <p className="text-gray-600 mt-1">Class-wide attendance overview and trends</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => {
                  // Reload data (triggers useEffect)
                  setStartDate(startDate);
                }}
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{classStats.totalStudents}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Average Attendance</p>
              <p className={`text-2xl font-bold mt-1 ${getAttendanceCategory(classStats.averageAttendanceRate).color}`}>
                {classStats.averageAttendanceRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">School Days</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{classStats.totalSchoolDays}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Above 90%</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {classStats.studentsAboveThreshold}/{classStats.totalStudents}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Student Attendance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentAttendance.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No attendance data for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Days
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Excused
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentAttendance.map(sa => {
                    const category = getAttendanceCategory(sa.stats.attendanceRate);

                    return (
                      <tr key={sa.student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {sa.student.firstName} {sa.student.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{sa.student.admissionNumber}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap text-sm text-gray-900">
                          {sa.stats.totalDays}
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {sa.stats.presentDays}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {sa.stats.absentDays}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {sa.stats.lateDays}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {sa.stats.excusedDays}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className={`font-bold ${category.color}`}>
                            {category.icon} {sa.stats.attendanceRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">{category.label}</div>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/attendance/student/${sa.student.id}`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
