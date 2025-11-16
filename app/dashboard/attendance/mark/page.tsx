'use client';

/**
 * Mark Attendance Page (Phase 21)
 * Daily attendance marking for classes
 *
 * Features:
 * - Select class and date
 * - Quick mark all present
 * - Individual status selection
 * - Add notes/reasons
 * - Bulk save
 * - View previous attendance
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/auditLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import {
  AttendanceStatus,
  AttendancePeriod,
  ATTENDANCE_STATUS_CONFIG,
  formatAttendanceDate,
} from '@/lib/attendance/config';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  reason?: string;
  notes?: string;
}

export default function MarkAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<AttendancePeriod>(AttendancePeriod.FULL_DAY);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [existingAttendance, setExistingAttendance] = useState<Map<string, any>>(new Map());
  const [isValidDate, setIsValidDate] = useState(true);
  const [dateMessage, setDateMessage] = useState('');
  const [activeTerm, setActiveTerm] = useState<any>(null);

  // Validate selected date (must be Mon-Fri within term)
  useEffect(() => {
    const validateDate = async () => {
      if (!user?.tenantId || !selectedDate) return;

      try {
        const checkDate = new Date(selectedDate);
        const dayOfWeek = checkDate.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

        // Load active term if not already loaded
        if (!activeTerm) {
          const termsQuery = query(
            collection(db, 'terms'),
            where('tenantId', '==', user.tenantId),
            where('isActive', '==', true)
          );
          const termsSnapshot = await getDocs(termsQuery);

          if (!termsSnapshot.empty) {
            const termData = termsSnapshot.docs[0].data();
            const term = {
              id: termsSnapshot.docs[0].id,
              name: termData.name,
              startDate: termData.startDate,
              endDate: termData.endDate,
              isActive: termData.isActive,
              holidays: termData.holidays || [],
            };
            setActiveTerm(term);
          }
        }

        // Check if within term dates
        let isWithinTermDates = false;
        if (activeTerm) {
          const termStart = activeTerm.startDate?.toDate();
          const termEnd = activeTerm.endDate?.toDate();

          if (termStart && termEnd) {
            const checkMidnight = new Date(checkDate);
            checkMidnight.setHours(0, 0, 0, 0);
            isWithinTermDates = checkMidnight >= termStart && checkMidnight <= termEnd;
          }
        }

        // Check if selected date is a holiday
        let isHoliday = false;
        let holidayName = '';
        if (activeTerm && activeTerm.holidays && Array.isArray(activeTerm.holidays)) {
          for (const holiday of activeTerm.holidays) {
            const holidayStart = holiday.startDate?.toDate();
            const holidayEnd = holiday.endDate?.toDate();
            if (holidayStart && holidayEnd) {
              const checkMidnight = new Date(checkDate);
              checkMidnight.setHours(0, 0, 0, 0);
              if (checkMidnight >= holidayStart && checkMidnight <= holidayEnd) {
                isHoliday = true;
                holidayName = holiday.name;
                break;
              }
            }
          }
        }

        const isValid = isWeekday && (isWithinTermDates || !activeTerm) && !isHoliday;
        setIsValidDate(isValid);

        if (!isWeekday) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          setDateMessage(`${dayNames[dayOfWeek]} is not a school day. Please select Monday through Friday.`);
        } else if (isHoliday) {
          setDateMessage(`Selected date is a holiday: ${holidayName}. Attendance cannot be marked on holidays.`);
        } else if (activeTerm && !isWithinTermDates) {
          setDateMessage(`Selected date is outside the active term (${activeTerm.name}: ${activeTerm.startDate?.toDate().toLocaleDateString()} - ${activeTerm.endDate?.toDate().toLocaleDateString()}).`);
        } else if (!activeTerm) {
          setDateMessage('');
        } else {
          setDateMessage('');
        }
      } catch (error) {
        console.error('Error validating date:', error);
      }
    };

    validateDate();
  }, [selectedDate, user?.tenantId, activeTerm]);

  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!user?.tenantId) return;

      try {
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

        setClasses(classesData);

        // Set initial class from URL or first class
        const initialClass = searchParams.get('classId') || classesData[0]?.id || '';
        setSelectedClassId(initialClass);

        setLoading(false);
      } catch (error) {
        console.error('Error loading classes:', error);
        setLoading(false);
      }
    };

    loadClasses();
  }, [user?.tenantId, searchParams]);

  // Load students when class changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClassId || !user?.tenantId) return;

      try {
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', selectedClassId),
          where('isActive', '==', true)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          admissionNumber: doc.data().admissionNumber,
        })) as Student[];

        // Sort by name
        studentsData.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );

        setStudents(studentsData);

        // Initialize all as present by default
        const initialAttendance = new Map<string, AttendanceEntry>();
        studentsData.forEach(student => {
          initialAttendance.set(student.id, {
            studentId: student.id,
            status: AttendanceStatus.PRESENT,
          });
        });
        setAttendance(initialAttendance);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };

    loadStudents();
  }, [selectedClassId, user?.tenantId]);

  // Load existing attendance when date/class changes
  useEffect(() => {
    const loadExistingAttendance = async () => {
      if (!selectedClassId || !selectedDate || !user?.tenantId) return;

      try {
        const dateStart = new Date(selectedDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(selectedDate);
        dateEnd.setHours(23, 59, 59, 999);

        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('classId', '==', selectedClassId),
          where('date', '>=', Timestamp.fromDate(dateStart)),
          where('date', '<=', Timestamp.fromDate(dateEnd)),
          where('period', '==', period)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const existingMap = new Map();
        const attendanceMap = new Map(attendance);

        attendanceSnapshot.docs.forEach(doc => {
          const data = doc.data();
          existingMap.set(data.studentId, { id: doc.id, ...data });

          // Update attendance map with existing data
          attendanceMap.set(data.studentId, {
            studentId: data.studentId,
            status: data.status as AttendanceStatus,
            reason: data.reason,
            notes: data.notes,
          });
        });

        setExistingAttendance(existingMap);
        setAttendance(attendanceMap);
      } catch (error) {
        console.error('Error loading existing attendance:', error);
      }
    };

    if (students.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedClassId, selectedDate, period, user?.tenantId, students.length]);

  const handleMarkAll = (status: AttendanceStatus) => {
    const newAttendance = new Map<string, AttendanceEntry>();
    students.forEach(student => {
      newAttendance.set(student.id, {
        studentId: student.id,
        status,
      });
    });
    setAttendance(newAttendance);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const entry = attendance.get(studentId) || { studentId, status: AttendanceStatus.PRESENT };
    setAttendance(new Map(attendance.set(studentId, { ...entry, status })));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    const entry = attendance.get(studentId) || { studentId, status: AttendanceStatus.PRESENT };
    setAttendance(new Map(attendance.set(studentId, { ...entry, notes })));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    const entry = attendance.get(studentId) || { studentId, status: AttendanceStatus.PRESENT };
    setAttendance(new Map(attendance.set(studentId, { ...entry, reason })));
  };

  const handleSave = async () => {
    if (!user?.tenantId || !user?.uid || !selectedClassId) return;

    setSaving(true);

    try {
      const batch = writeBatch(db);
      const attendanceDate = new Date(selectedDate);
      attendanceDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues

      attendance.forEach((entry, studentId) => {
        const existing = existingAttendance.get(studentId);

        const attendanceData = {
          studentId,
          classId: selectedClassId,
          date: Timestamp.fromDate(attendanceDate),
          status: entry.status,
          period,
          reason: entry.reason || null,
          notes: entry.notes || null,
          markedBy: user.uid,
          markedAt: serverTimestamp(),
          tenantId: user.tenantId,
          updatedAt: serverTimestamp(),
        };

        if (existing) {
          // Update existing record
          batch.update(doc(db, 'attendance', existing.id), attendanceData);
        } else {
          // Create new record
          const newDocRef = doc(collection(db, 'attendance'));
          batch.set(newDocRef, {
            ...attendanceData,
            createdAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();

      // Log audit
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: existingAttendance.size > 0 ? 'update' : 'create',
        entityType: 'attendance',
        entityId: `${selectedClassId}-${selectedDate}`,
        entityName: classes.find(c => c.id === selectedClassId)?.name,
        metadata: {
          classId: selectedClassId,
          date: selectedDate,
          period,
          studentsCount: students.length,
          presentCount: Array.from(attendance.values()).filter(
            a => ATTENDANCE_STATUS_CONFIG[a.status].countsAsPresent
          ).length,
        },
      });

      // Reload existing attendance
      const newExisting = new Map();
      attendance.forEach((entry, studentId) => {
        newExisting.set(studentId, entry);
      });
      setExistingAttendance(newExisting);

      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Array.from(attendance.values()).filter(
    a => ATTENDANCE_STATUS_CONFIG[a.status].countsAsPresent
  ).length;
  const absentCount = students.length - presentCount;
  const attendanceRate = students.length > 0 ? (presentCount / students.length) * 100 : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-600 mt-1">Record daily student attendance</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/attendance')}>
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Attendance
        </Button>
      </div>

      {/* Date Validation Alert */}
      {!isValidDate && dateMessage && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Invalid Date Selected</p>
                <p className="text-sm text-yellow-700 mt-1">{dateMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Period Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as AttendancePeriod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={AttendancePeriod.FULL_DAY}>Full Day</option>
                <option value={AttendancePeriod.MORNING}>Morning</option>
                <option value={AttendancePeriod.AFTERNOON}>Afternoon</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Mark
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                  className="flex-1"
                >
                  All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                  className="flex-1"
                >
                  All Absent
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{presentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{absentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{attendanceRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance ({formatAttendanceDate(new Date(selectedDate))})</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No students in this class</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map(student => {
                    const entry = attendance.get(student.id);
                    const status = entry?.status || AttendanceStatus.PRESENT;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{student.admissionNumber}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(student.id, e.target.value as AttendanceStatus)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.entries(ATTENDANCE_STATUS_CONFIG).map(([value, config]) => (
                              <option key={value} value={value}>
                                {config.icon} {config.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          {!ATTENDANCE_STATUS_CONFIG[status].countsAsPresent && (
                            <input
                              type="text"
                              value={entry?.reason || ''}
                              onChange={(e) => handleReasonChange(student.id, e.target.value)}
                              placeholder="Reason for absence..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={entry?.notes || ''}
                            onChange={(e) => handleNotesChange(student.id, e.target.value)}
                            placeholder="Optional notes..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
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

      {/* Save Button */}
      {students.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !isValidDate}
            className="flex-1"
            title={!isValidDate ? 'Cannot save attendance for non-school days' : ''}
          >
            {saving ? 'Saving...' : existingAttendance.size > 0 ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      )}
    </div>
  );
}
