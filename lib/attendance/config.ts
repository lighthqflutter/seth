/**
 * Attendance Configuration (Phase 21)
 *
 * Data models and configuration for attendance tracking
 */

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
  SICK = 'sick',
  PERMISSION = 'permission',
}

export enum AttendancePeriod {
  FULL_DAY = 'full_day',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  CUSTOM = 'custom',
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  period: AttendancePeriod;
  reason?: string;
  notes?: string;
  markedBy: string; // Teacher/Admin UID
  markedAt: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number; // Percentage
}

export interface ClassAttendanceSummary {
  date: Date;
  classId: string;
  className: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  stats: AttendanceStats;
  recentRecords: AttendanceRecord[];
  alerts: AttendanceAlert[];
}

export interface AttendanceAlert {
  type: 'chronic_absence' | 'consecutive_absence' | 'late_pattern';
  severity: 'low' | 'medium' | 'high';
  message: string;
  count: number;
  threshold: number;
}

export const ATTENDANCE_STATUS_CONFIG = {
  [AttendanceStatus.PRESENT]: {
    label: 'Present',
    color: 'bg-green-100 text-green-800',
    icon: '✓',
    description: 'Student is present',
    countsAsPresent: true,
  },
  [AttendanceStatus.ABSENT]: {
    label: 'Absent',
    color: 'bg-red-100 text-red-800',
    icon: '✗',
    description: 'Student is absent without permission',
    countsAsPresent: false,
  },
  [AttendanceStatus.LATE]: {
    label: 'Late',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏰',
    description: 'Student arrived late',
    countsAsPresent: true,
  },
  [AttendanceStatus.EXCUSED]: {
    label: 'Excused',
    color: 'bg-blue-100 text-blue-800',
    icon: '📝',
    description: 'Absence with permission',
    countsAsPresent: false,
  },
  [AttendanceStatus.SICK]: {
    label: 'Sick',
    color: 'bg-purple-100 text-purple-800',
    icon: '🤒',
    description: 'Student is sick',
    countsAsPresent: false,
  },
  [AttendanceStatus.PERMISSION]: {
    label: 'Permission',
    color: 'bg-indigo-100 text-indigo-800',
    icon: '📄',
    description: 'Official permission to be absent',
    countsAsPresent: false,
  },
};

export const ATTENDANCE_THRESHOLDS = {
  CHRONIC_ABSENCE: 0.90, // Below 90% attendance rate
  CONSECUTIVE_ABSENCE: 3, // 3+ consecutive absences
  LATE_PATTERN: 5, // 5+ late arrivals in a month
  EXCELLENT_ATTENDANCE: 0.95, // Above 95%
  GOOD_ATTENDANCE: 0.90, // 90-95%
  POOR_ATTENDANCE: 0.80, // Below 80%
};

/**
 * Calculate attendance rate
 */
export function calculateAttendanceRate(stats: AttendanceStats): number {
  if (stats.totalDays === 0) return 0;
  return (stats.presentDays / stats.totalDays) * 100;
}

/**
 * Get attendance rate category
 */
export function getAttendanceCategory(rate: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (rate >= ATTENDANCE_THRESHOLDS.EXCELLENT_ATTENDANCE * 100) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      icon: '⭐',
    };
  } else if (rate >= ATTENDANCE_THRESHOLDS.GOOD_ATTENDANCE * 100) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      icon: '👍',
    };
  } else if (rate >= ATTENDANCE_THRESHOLDS.POOR_ATTENDANCE * 100) {
    return {
      label: 'Fair',
      color: 'text-yellow-600',
      icon: '⚠️',
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-600',
      icon: '🚨',
    };
  }
}

/**
 * Detect attendance alerts
 */
export function detectAttendanceAlerts(
  stats: AttendanceStats,
  recentRecords: AttendanceRecord[]
): AttendanceAlert[] {
  const alerts: AttendanceAlert[] = [];

  // Check chronic absence
  const rate = calculateAttendanceRate(stats);
  if (rate < ATTENDANCE_THRESHOLDS.CHRONIC_ABSENCE * 100) {
    alerts.push({
      type: 'chronic_absence',
      severity: rate < ATTENDANCE_THRESHOLDS.POOR_ATTENDANCE * 100 ? 'high' : 'medium',
      message: `Attendance rate is ${rate.toFixed(1)}%, below the ${ATTENDANCE_THRESHOLDS.CHRONIC_ABSENCE * 100}% threshold`,
      count: stats.absentDays,
      threshold: ATTENDANCE_THRESHOLDS.CHRONIC_ABSENCE,
    });
  }

  // Check consecutive absences
  let consecutiveAbsences = 0;
  let maxConsecutive = 0;
  const sortedRecords = [...recentRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const record of sortedRecords) {
    if (record.status === AttendanceStatus.ABSENT) {
      consecutiveAbsences++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveAbsences);
    } else if (ATTENDANCE_STATUS_CONFIG[record.status].countsAsPresent) {
      consecutiveAbsences = 0;
    }
  }

  if (maxConsecutive >= ATTENDANCE_THRESHOLDS.CONSECUTIVE_ABSENCE) {
    alerts.push({
      type: 'consecutive_absence',
      severity: maxConsecutive >= 5 ? 'high' : 'medium',
      message: `${maxConsecutive} consecutive absences detected`,
      count: maxConsecutive,
      threshold: ATTENDANCE_THRESHOLDS.CONSECUTIVE_ABSENCE,
    });
  }

  // Check late pattern
  if (stats.lateDays >= ATTENDANCE_THRESHOLDS.LATE_PATTERN) {
    alerts.push({
      type: 'late_pattern',
      severity: 'low',
      message: `${stats.lateDays} late arrivals recorded`,
      count: stats.lateDays,
      threshold: ATTENDANCE_THRESHOLDS.LATE_PATTERN,
    });
  }

  return alerts;
}

/**
 * Format date for attendance display
 */
export function formatAttendanceDate(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get school days in date range (excluding weekends)
 */
export function getSchoolDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    // Exclude weekends (Saturday = 6, Sunday = 0)
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}
