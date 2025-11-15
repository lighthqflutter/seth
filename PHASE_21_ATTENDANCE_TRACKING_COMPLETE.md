# Phase 21: Attendance Tracking - Complete Documentation

## Overview

Phase 21 implements a comprehensive attendance tracking system for monitoring student presence, detecting patterns, and generating reports. The system supports multiple attendance statuses, automated alerts for at-risk students, and detailed analytics.

## Features Implemented

### 1. Attendance Data Model
- **Location**: `lib/attendance/config.ts`
- **Status Types**: 6 distinct attendance statuses
  - Present (✓) - Student is present
  - Absent (✗) - Unexcused absence
  - Late (⏰) - Arrived late but present
  - Excused (📝) - Absence with permission
  - Sick (🤒) - Medical absence
  - Permission (📄) - Official permission granted
- **Periods**: Full day, morning, afternoon, custom
- **Thresholds**:
  - Chronic absence: Below 90% attendance rate
  - Consecutive absence: 3+ days in a row
  - Late pattern: 5+ late arrivals in a month

### 2. Daily Attendance Marking Interface
- **Location**: `app/dashboard/attendance/mark/page.tsx`
- **Features**:
  - Class and date selector
  - Period selection (full day, morning, afternoon)
  - Quick "Mark All Present/Absent" buttons
  - Individual student status dropdowns
  - Reason and notes fields for absences
  - Real-time statistics display
  - Batch save with atomic updates
  - Automatic audit trail

**Code Example**:
```typescript
// Batch save attendance for entire class
const batch = writeBatch(db);
attendance.forEach((entry, studentId) => {
  const attendanceData = {
    studentId,
    classId: selectedClassId,
    date: Timestamp.fromDate(attendanceDate),
    status: entry.status,
    period,
    reason: entry.reason,
    notes: entry.notes,
    markedBy: user.uid,
    markedAt: serverTimestamp(),
    tenantId: user.tenantId,
  };

  if (existing) {
    batch.update(doc(db, 'attendance', existing.id), attendanceData);
  } else {
    batch.set(doc(collection(db, 'attendance')), {
      ...attendanceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
});
await batch.commit();
```

### 3. Student Attendance History
- **Location**: `app/dashboard/attendance/student/[studentId]/page.tsx`
- **Features**:
  - Comprehensive attendance statistics
  - Performance category badges (Excellent/Good/Fair/Poor)
  - Alert notifications (chronic absence, consecutive absences, late patterns)
  - Month-by-month record view
  - Status breakdown with percentages
  - Visual indicators for each status type

**Statistics Calculated**:
- Total days tracked
- Present days (includes late arrivals)
- Absent days
- Late days
- Excused days (sick, permission, excused)
- Attendance rate percentage

### 4. Class Attendance Report
- **Location**: `app/dashboard/attendance/class/[classId]/page.tsx`
- **Features**:
  - Date range selector (custom reporting periods)
  - Class-wide statistics dashboard
  - Student-wise breakdown table
  - Color-coded attendance rates
  - CSV export functionality
  - School days calculation (excludes weekends)

**Export Example**:
```typescript
const handleExportCSV = () => {
  const headers = [
    'Student Name', 'Admission Number', 'Total Days',
    'Present', 'Absent', 'Late', 'Excused', 'Attendance Rate (%)'
  ];

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
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download blob
};
```

### 5. Main Attendance Dashboard
- **Location**: `app/dashboard/attendance/page.tsx`
- **Features**:
  - Overall statistics cards
    - Total students enrolled
    - Classes marked today vs total
    - Average attendance rate
    - Students absent/late today
  - Alert system
    - Unmarked classes notification
    - High absenteeism warnings (>10%)
  - Classes overview grid
    - Today's stats per class
    - Weekly attendance rate with progress bars
    - Quick action buttons (Mark Today, View Report)
  - Quick actions menu
    - Mark Attendance
    - View Analytics
    - Export Reports

**Alert Detection**:
```typescript
// Alert if classes not marked today
const unmarkedClasses = classesWithStats.filter(c => !c.markedToday);
if (unmarkedClasses.length > 0) {
  alerts.push({
    type: 'unmarked_classes',
    message: `${unmarkedClasses.length} class${unmarkedClasses.length > 1 ? 'es' : ''} not marked today`,
    severity: 'medium',
  });
}

// Alert if high absenteeism
if (studentsAbsentToday > totalStudents * 0.1) {
  alerts.push({
    type: 'high_absence',
    message: `${studentsAbsentToday} students absent today (${((studentsAbsentToday / totalStudents) * 100).toFixed(1)}%)`,
    severity: 'high',
  });
}
```

## Database Schema

### Attendance Collection
```typescript
interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: Timestamp;
  status: AttendanceStatus;
  period: AttendancePeriod;
  reason?: string;
  notes?: string;
  markedBy: string; // Teacher/Admin UID
  markedAt: Timestamp;
  tenantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Required Indexes
```
Collection: attendance
Indexes:
1. tenantId (ASC) + classId (ASC) + date (ASC)
2. tenantId (ASC) + studentId (ASC) + date (DESC)
3. tenantId (ASC) + date (ASC)
4. tenantId (ASC) + classId (ASC) + date (ASC) + status (ASC)
```

## Helper Functions

### calculateAttendanceRate()
Calculates attendance percentage based on present days vs total days.

```typescript
export function calculateAttendanceRate(stats: AttendanceStats): number {
  if (stats.totalDays === 0) return 0;
  return (stats.presentDays / stats.totalDays) * 100;
}
```

### getAttendanceCategory()
Returns performance category with color and icon based on attendance rate.

```typescript
export function getAttendanceCategory(rate: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (rate >= 95) return { label: 'Excellent', color: 'text-green-600', icon: '⭐' };
  if (rate >= 90) return { label: 'Good', color: 'text-blue-600', icon: '👍' };
  if (rate >= 80) return { label: 'Fair', color: 'text-yellow-600', icon: '⚠️' };
  return { label: 'Poor', color: 'text-red-600', icon: '🚨' };
}
```

### detectAttendanceAlerts()
Analyzes attendance data and returns alerts for at-risk students.

```typescript
export function detectAttendanceAlerts(
  stats: AttendanceStats,
  recentRecords: AttendanceRecord[]
): AttendanceAlert[] {
  const alerts: AttendanceAlert[] = [];

  // Check chronic absence (below 90%)
  const rate = calculateAttendanceRate(stats);
  if (rate < 90) {
    alerts.push({
      type: 'chronic_absence',
      severity: rate < 80 ? 'high' : 'medium',
      message: `Attendance rate is ${rate.toFixed(1)}%, below the 90% threshold`,
      count: stats.absentDays,
      threshold: 0.90,
    });
  }

  // Check consecutive absences (3+ days)
  let consecutiveAbsences = 0;
  let maxConsecutive = 0;
  const sortedRecords = [...recentRecords].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const record of sortedRecords) {
    if (record.status === AttendanceStatus.ABSENT) {
      consecutiveAbsences++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveAbsences);
    } else if (ATTENDANCE_STATUS_CONFIG[record.status].countsAsPresent) {
      consecutiveAbsences = 0;
    }
  }

  if (maxConsecutive >= 3) {
    alerts.push({
      type: 'consecutive_absence',
      severity: maxConsecutive >= 5 ? 'high' : 'medium',
      message: `${maxConsecutive} consecutive absences detected`,
      count: maxConsecutive,
      threshold: 3,
    });
  }

  // Check late pattern (5+ late arrivals)
  if (stats.lateDays >= 5) {
    alerts.push({
      type: 'late_pattern',
      severity: 'low',
      message: `${stats.lateDays} late arrivals recorded`,
      count: stats.lateDays,
      threshold: 5,
    });
  }

  return alerts;
}
```

### getSchoolDays()
Returns array of school days in date range, excluding weekends.

```typescript
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
```

## Security & Access Control

### Role-Based Access
- **Admin**: Full access to all attendance features
- **Teacher**: Mark attendance for assigned classes, view reports
- **Parent**: View own children's attendance history only

### Data Isolation
All queries include `tenantId` filter to ensure multi-tenant data isolation.

```typescript
const attendanceQuery = query(
  collection(db, 'attendance'),
  where('tenantId', '==', user.tenantId),
  where('classId', '==', classId),
  where('date', '>=', Timestamp.fromDate(startDate)),
  where('date', '<=', Timestamp.fromDate(endDate))
);
```

## Integration Points

### Email Notifications (Phase 18)
Attendance data can trigger email notifications:
- **Chronic Absence Alert**: Notify parents when student falls below 90%
- **Consecutive Absence Alert**: Email after 3+ consecutive absences
- **Weekly Summary**: Send attendance digest to parents

**Integration Example**:
```typescript
// After detecting chronic absence
if (alertDetected) {
  await sendEmail({
    to: parentEmail,
    type: EmailType.ATTENDANCE_ALERT,
    data: {
      studentName,
      attendanceRate: stats.attendanceRate,
      absentDays: stats.absentDays,
      totalDays: stats.totalDays,
    },
  });
}
```

### Results Integration (Future)
Attendance data should be included in result cards:
- Display attendance rate on result PDFs
- Include attendance in performance metrics
- Factor attendance into conduct grades

### Analytics Dashboard (Phase TBD)
Attendance data feeds into analytics:
- School-wide attendance trends
- Class comparison charts
- Monthly/termly reports
- Correlation with academic performance

## Usage Examples

### 1. Mark Daily Attendance
```typescript
// Teacher marks attendance for their class
1. Navigate to /dashboard/attendance/mark
2. Select class from dropdown
3. Select date (defaults to today)
4. Click "Mark All Present" for quick marking
5. Adjust individual students who are absent/late
6. Add reason/notes for absences
7. Click "Save Attendance"
```

### 2. View Student History
```typescript
// Parent views child's attendance
1. Navigate to /dashboard/attendance/student/[studentId]
2. View overall statistics and alerts
3. Select month to see detailed records
4. Review status breakdown and patterns
```

### 3. Generate Class Report
```typescript
// Admin generates class report
1. Navigate to /dashboard/attendance/class/[classId]
2. Select date range (e.g., current term)
3. Review student-wise breakdown
4. Click "Export CSV" to download report
5. Share with stakeholders
```

### 4. Monitor Dashboard
```typescript
// Admin monitors school-wide attendance
1. Navigate to /dashboard/attendance
2. Review overall statistics
3. Check alerts for unmarked classes
4. Click "Mark Today" on class cards for quick access
5. Use "View Analytics" for deeper insights
```

## Performance Considerations

### Query Optimization
- Use composite indexes for common queries
- Limit date ranges to avoid large result sets
- Implement pagination for large class sizes

### Batch Operations
- Use `writeBatch()` for marking entire class
- Maximum 500 operations per batch
- Implement retry logic for failed batches

### Caching Strategy
- Cache class student lists
- Store daily stats in memory
- Invalidate cache after attendance updates

## Future Enhancements

### Phase 21+ Additions
1. **Attendance Analytics Dashboard**
   - Trend charts (daily, weekly, monthly)
   - Class comparison graphs
   - Correlation with academic performance
   - Predictive analytics for at-risk students

2. **Advanced Features**
   - QR code check-in for students
   - Geofencing for attendance verification
   - Biometric integration
   - SMS notifications for absences
   - Automated parent notifications

3. **Reporting Enhancements**
   - PDF attendance certificates
   - Government compliance reports
   - Truancy reports
   - Attendance forecasting

4. **Integration Improvements**
   - Link to timetable system
   - Integrate with school bell schedule
   - Connect to parent portal
   - Sync with student information system

## Testing Recommendations

### Unit Tests
```typescript
describe('Attendance Helper Functions', () => {
  it('should calculate attendance rate correctly', () => {
    const stats = {
      totalDays: 20,
      presentDays: 18,
      absentDays: 2,
      lateDays: 1,
      excusedDays: 0,
      attendanceRate: 90,
    };
    expect(calculateAttendanceRate(stats)).toBe(90);
  });

  it('should detect chronic absence', () => {
    const stats = {
      totalDays: 20,
      presentDays: 15,
      absentDays: 5,
      lateDays: 0,
      excusedDays: 0,
      attendanceRate: 75,
    };
    const alerts = detectAttendanceAlerts(stats, []);
    expect(alerts).toContainEqual(
      expect.objectContaining({ type: 'chronic_absence' })
    );
  });
});
```

### Integration Tests
- Test attendance marking workflow
- Verify alert detection logic
- Validate CSV export format
- Test date range queries

## Troubleshooting

### Common Issues

**Issue**: Attendance not saving
- Check Firestore rules allow write access
- Verify user has `markedBy` permission
- Ensure tenantId is set correctly

**Issue**: Incorrect attendance rate
- Verify `countsAsPresent` configuration
- Check for duplicate records
- Validate date range filters

**Issue**: Missing students in class
- Confirm student's `currentClassId` matches
- Check `isActive` status
- Verify tenantId isolation

**Issue**: Alerts not showing
- Ensure sufficient historical data (30+ days)
- Check threshold configurations
- Verify alert detection logic

## Maintenance

### Regular Tasks
- Monitor attendance completion rates
- Review alert accuracy
- Clean up old attendance records (archive after 3 years)
- Optimize query performance
- Update attendance policies as needed

### Backup Strategy
- Daily Firestore backups
- Export attendance data monthly
- Archive old records to cold storage
- Maintain audit trail for compliance

## Conclusion

Phase 21 provides a robust attendance tracking system with:
- ✅ 6 attendance status types
- ✅ Daily marking interface with batch updates
- ✅ Student history with alerts
- ✅ Class reports with CSV export
- ✅ Main dashboard with statistics
- ✅ Alert detection (chronic absence, consecutive absence, late patterns)
- ✅ Multi-tenant data isolation
- ✅ Complete audit trail

The system is production-ready and can operate independently as a monetizable module for schools.

## Related Documentation
- Phase 18: Email Notifications (`PHASE_18_EMAIL_NOTIFICATIONS_COMPLETE.md`)
- Phase 20: Guardian Management
- Multi-Tenant Architecture (`Multi-Tenant_Architecture_SingleDB_Model.pdf`)

## Support
For issues or questions, refer to the main project documentation or contact the development team.
