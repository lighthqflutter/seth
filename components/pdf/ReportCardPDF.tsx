/**
 * PDF Report Card Template (Phase 17)
 * Professional report card with school branding using React-PDF
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Register fonts for better typography
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
// });

interface SubjectScore {
  subjectName: string;
  total: number;
  percentage: number;
  grade: string;
  maxScore: number;
  isAbsent?: boolean;
  isExempted?: boolean;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: string;
  dateOfBirth?: Date;
}

interface ClassInfo {
  name: string;
  level: string;
}

interface TermInfo {
  name: string;
  academicYear: string;
  startDate?: Date;
  endDate?: Date;
}

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  motto?: string;
}

interface ResultSummary {
  totalScore: number;
  averageScore: number;
  numberOfSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
  position: number;
  classSize: number;
  overallGrade: string;
  remark: string;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
}

interface ReportCardData {
  student: StudentInfo;
  class: ClassInfo;
  term: TermInfo;
  school: SchoolInfo;
  scores: SubjectScore[];
  summary: ResultSummary;
  attendance?: AttendanceSummary;
  teacherComment?: string;
  principalComment?: string;
}

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },

  // Header styles
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 4,
  },
  schoolAddress: {
    fontSize: 9,
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: 2,
  },
  schoolContact: {
    fontSize: 8,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 2,
  },
  schoolMotto: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#2563eb',
    marginTop: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Student info section
  infoSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
  },

  // Scores table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    padding: 6,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 9,
    color: '#111827',
    textAlign: 'center',
  },
  tableCellLeft: {
    textAlign: 'left',
  },

  // Column widths
  col1: { width: '5%' },
  col2: { width: '35%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '15%' },
  col6: { width: '15%' },

  // Summary section
  summarySection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    border: 1,
    borderColor: '#2563eb',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    textAlign: 'center',
  },

  // Attendance section
  attendanceSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    border: 1,
    borderColor: '#10b981',
  },
  attendanceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 8,
    textAlign: 'center',
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendanceItem: {
    width: '30%',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    border: 1,
    borderColor: '#bbf7d0',
  },
  attendanceLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  attendanceValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#047857',
  },
  attendanceRateExcellent: {
    color: '#047857',
  },
  attendanceRateGood: {
    color: '#1d4ed8',
  },
  attendanceRateFair: {
    color: '#ea580c',
  },
  attendanceRatePoor: {
    color: '#dc2626',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    width: '30%',
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    border: 1,
    borderColor: '#bfdbfe',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Comments section
  commentSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    border: 1,
    borderColor: '#e5e7eb',
  },
  commentTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 9,
    color: '#111827',
    lineHeight: 1.4,
  },

  // Remark section
  remarkSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    border: 1,
    borderColor: '#f59e0b',
  },
  remarkText: {
    fontSize: 9,
    color: '#92400e',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Signature section
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 20,
  },
  signatureLine: {
    borderTop: 1,
    borderTopColor: '#9ca3af',
    marginTop: 5,
  },
  signatureName: {
    fontSize: 8,
    color: '#374151',
    marginTop: 3,
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },

  // Grade badges
  gradeA: {
    color: '#047857',
    fontWeight: 'bold',
  },
  gradeB: {
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  gradeC: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  gradeD: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  gradeF: {
    color: '#991b1b',
    fontWeight: 'bold',
  },
});

// Helper function to get grade style
const getGradeStyle = (grade: string) => {
  if (grade.startsWith('A')) return styles.gradeA;
  if (grade.startsWith('B')) return styles.gradeB;
  if (grade.startsWith('C')) return styles.gradeC;
  if (grade.startsWith('D') || grade.startsWith('E')) return styles.gradeD;
  return styles.gradeF;
};

// Helper function to get attendance rate style
const getAttendanceRateStyle = (rate: number) => {
  if (rate >= 95) return styles.attendanceRateExcellent;
  if (rate >= 90) return styles.attendanceRateGood;
  if (rate >= 80) return styles.attendanceRateFair;
  return styles.attendanceRatePoor;
};

// Helper function to get attendance rate label
const getAttendanceRateLabel = (rate: number): string => {
  if (rate >= 95) return 'Excellent';
  if (rate >= 90) return 'Good';
  if (rate >= 80) return 'Fair';
  return 'Needs Improvement';
};

// Helper function to get position suffix
const getPositionSuffix = (position: number): string => {
  const lastDigit = position % 10;
  const lastTwoDigits = position % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th`;
  }

  switch (lastDigit) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
};

// Helper to format date
const formatDate = (date?: Date): string => {
  if (!date) return 'N/A';
  if (typeof date === 'object' && 'toDate' in date) {
    // Firestore Timestamp
    return (date as any).toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  if (date instanceof Date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return String(date);
};

interface ReportCardPDFProps {
  data: ReportCardData;
}

export const ReportCardPDF: React.FC<ReportCardPDFProps> = ({ data }) => {
  const { student, class: classInfo, term, school, scores, summary, attendance, teacherComment, principalComment } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with school info */}
        <View style={styles.header}>
          {school.logoUrl && (
            <Image
              src={school.logoUrl}
              style={{ width: 60, height: 60, marginBottom: 10, alignSelf: 'center' }}
            />
          )}
          <Text style={styles.schoolName}>{school.name.toUpperCase()}</Text>
          <Text style={styles.schoolAddress}>{school.address}</Text>
          <Text style={styles.schoolContact}>
            {school.phone} | {school.email}
            {school.website && ` | ${school.website}`}
          </Text>
          {school.motto && <Text style={styles.schoolMotto}>"{school.motto}"</Text>}
          <Text style={styles.reportTitle}>Student Report Card</Text>
        </View>

        {/* Student and Term Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student Name:</Text>
            <Text style={styles.infoValue}>
              {student.firstName} {student.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Admission Number:</Text>
            <Text style={styles.infoValue}>{student.admissionNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class:</Text>
            <Text style={styles.infoValue}>
              {classInfo.name} ({classInfo.level})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{student.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Term:</Text>
            <Text style={styles.infoValue}>
              {term.name} - {term.academicYear}
            </Text>
          </View>
          {term.startDate && term.endDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Session:</Text>
              <Text style={styles.infoValue}>
                {formatDate(term.startDate)} to {formatDate(term.endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Scores Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.col2, { textAlign: 'left' }]}>Subject</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Max Score</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Total</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>%</Text>
            <Text style={[styles.tableHeaderCell, styles.col6]}>Grade</Text>
          </View>

          {/* Table Rows */}
          {scores.map((score, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
              <Text style={[styles.tableCell, styles.col2, styles.tableCellLeft]}>
                {score.subjectName}
              </Text>
              <Text style={[styles.tableCell, styles.col3]}>{score.maxScore}</Text>
              <Text style={[styles.tableCell, styles.col4]}>
                {score.isAbsent ? 'ABS' : score.isExempted ? 'EX' : score.total.toFixed(1)}
              </Text>
              <Text style={[styles.tableCell, styles.col5]}>
                {score.isAbsent ? '-' : score.isExempted ? '-' : `${score.percentage.toFixed(1)}%`}
              </Text>
              <Text style={[styles.tableCell, styles.col6, getGradeStyle(score.grade)]}>
                {score.isAbsent ? '-' : score.isExempted ? '-' : score.grade}
              </Text>
            </View>
          ))}
        </View>

        {/* Attendance Summary */}
        {attendance && attendance.totalDays > 0 && (
          <View style={styles.attendanceSection}>
            <Text style={styles.attendanceTitle}>ATTENDANCE SUMMARY</Text>
            <View style={styles.attendanceGrid}>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Total Days</Text>
                <Text style={styles.attendanceValue}>{attendance.totalDays}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Present</Text>
                <Text style={styles.attendanceValue}>{attendance.presentDays}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Absent</Text>
                <Text style={[styles.attendanceValue, { color: '#dc2626' }]}>{attendance.absentDays}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Late</Text>
                <Text style={[styles.attendanceValue, { color: '#ea580c' }]}>{attendance.lateDays}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Excused</Text>
                <Text style={[styles.attendanceValue, { color: '#1d4ed8' }]}>{attendance.excusedDays}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceLabel}>Attendance Rate</Text>
                <Text style={[styles.attendanceValue, getAttendanceRateStyle(attendance.attendanceRate)]}>
                  {attendance.attendanceRate.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: '#047857', fontWeight: 'bold' }}>
                {getAttendanceRateLabel(attendance.attendanceRate)} Attendance
              </Text>
            </View>
          </View>
        )}

        {/* Performance Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>PERFORMANCE SUMMARY</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Score</Text>
              <Text style={styles.summaryValue}>{summary.totalScore.toFixed(1)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average (%)</Text>
              <Text style={styles.summaryValue}>{summary.averageScore.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Overall Grade</Text>
              <Text style={[styles.summaryValue, getGradeStyle(summary.overallGrade)]}>
                {summary.overallGrade}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Position</Text>
              <Text style={styles.summaryValue}>
                {getPositionSuffix(summary.position)} / {summary.classSize}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Subjects Passed</Text>
              <Text style={styles.summaryValue}>{summary.subjectsPassed}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Subjects Failed</Text>
              <Text style={styles.summaryValue}>{summary.subjectsFailed}</Text>
            </View>
          </View>
        </View>

        {/* Performance Remark */}
        <View style={styles.remarkSection}>
          <Text style={styles.remarkText}>REMARK: {summary.remark}</Text>
        </View>

        {/* Teacher's Comment */}
        {teacherComment && (
          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>Class Teacher's Comment:</Text>
            <Text style={styles.commentText}>{teacherComment}</Text>
          </View>
        )}

        {/* Principal's Comment */}
        {principalComment && (
          <View style={styles.commentSection}>
            <Text style={styles.commentTitle}>Principal's Comment:</Text>
            <Text style={styles.commentText}>{principalComment}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Class Teacher</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Signature & Date</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Principal/Headmaster</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Signature & Date</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })} | This is an official school document
        </Text>
      </Page>
    </Document>
  );
};

export default ReportCardPDF;
