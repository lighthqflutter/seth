/**
 * Dynamic PDF Report Card Component (Phase 10-11)
 * Renders report cards using template configuration
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { ReportCardTemplate } from '@/types/reportCardTemplate';

interface SubjectScore {
  subjectName: string;
  total: number;
  percentage: number;
  grade: string;
  maxScore: number;
  ca1?: number;
  ca2?: number;
  ca3?: number;
  exam?: number;
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

interface DynamicReportCardPDFProps {
  data: ReportCardData;
  template: ReportCardTemplate;
}

// Create dynamic styles based on template configuration
const createDynamicStyles = (template: ReportCardTemplate) => {
  const { branding, layout } = template;

  // Color scheme mapping
  const colorSchemes = {
    primary: { header: '#1e3a8a', text: '#ffffff', accent: '#3b82f6' },
    grayscale: { header: '#374151', text: '#ffffff', accent: '#6b7280' },
    custom: branding.customColors || { header: '#1e3a8a', borders: '#d1d5db', grades: '#10b981' },
  };

  const colors = branding.colorScheme === 'custom' && branding.customColors
    ? branding.customColors
    : colorSchemes[branding.colorScheme] || colorSchemes.primary;

  // Font size mapping
  const fontSizes = {
    small: { base: 9, header: 11, title: 13 },
    medium: { base: 10, header: 12, title: 14 },
    large: { base: 11, header: 13, title: 15 },
  };

  const fontSize = fontSizes[branding.fonts?.size || 'medium'];

  return StyleSheet.create({
    page: {
      padding: layout.margins?.top || 20,
      paddingRight: layout.margins?.right || 20,
      paddingBottom: layout.margins?.bottom || 20,
      paddingLeft: layout.margins?.left || 20,
      fontSize: fontSize.base,
      fontFamily: branding.fonts?.body || 'Helvetica',
    },
    header: {
      marginBottom: 15,
      paddingBottom: 10,
      borderBottom: 2,
      borderBottomColor: colors.header,
      textAlign: branding.logoPosition === 'center' ? 'center' : branding.logoPosition,
    },
    schoolName: {
      fontSize: fontSize.title,
      fontWeight: 'bold',
      color: colors.header,
      marginBottom: 4,
    },
    schoolMotto: {
      fontSize: fontSize.base - 1,
      fontStyle: 'italic',
      color: '#6b7280',
      marginBottom: 4,
    },
    schoolAddress: {
      fontSize: fontSize.base - 1,
      color: '#4b5563',
      marginBottom: 2,
    },
    reportTitle: {
      fontSize: fontSize.header + 2,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 10,
      color: colors.header,
    },
    studentInfoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 15,
      padding: 8,
      backgroundColor: '#f9fafb',
      borderRadius: 4,
    },
    studentInfoItem: {
      width: '50%',
      marginBottom: 5,
      flexDirection: 'row',
    },
    label: {
      fontSize: fontSize.base - 1,
      color: '#6b7280',
      marginRight: 4,
    },
    value: {
      fontSize: fontSize.base,
      fontWeight: 'bold',
      color: '#111827',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.header,
      padding: 6,
      borderRadius: 3,
      marginBottom: 2,
    },
    tableHeaderText: {
      fontSize: fontSize.base,
      fontWeight: 'bold',
      color: '#ffffff',
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottom: 1,
      borderBottomColor: '#e5e7eb',
      padding: 5,
    },
    tableRowAlt: {
      backgroundColor: '#f9fafb',
    },
    tableCell: {
      fontSize: fontSize.base,
      color: '#111827',
      textAlign: 'center',
    },
    tableCellLeft: {
      textAlign: 'left',
    },
    summarySection: {
      marginTop: 10,
      marginBottom: 10,
      padding: 10,
      backgroundColor: '#eff6ff',
      borderRadius: 4,
      border: 1,
      borderColor: colors.header,
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
    },
    summaryLabel: {
      fontSize: fontSize.base - 2,
      color: '#6b7280',
    },
    summaryValue: {
      fontSize: fontSize.base + 1,
      fontWeight: 'bold',
      color: colors.header,
    },
    commentSection: {
      marginTop: 10,
      marginBottom: 10,
    },
    commentBox: {
      padding: 8,
      backgroundColor: '#f9fafb',
      borderRadius: 4,
      border: 1,
      borderColor: '#e5e7eb',
      marginBottom: 8,
    },
    commentTitle: {
      fontSize: fontSize.base,
      fontWeight: 'bold',
      marginBottom: 4,
      color: colors.header,
    },
    commentText: {
      fontSize: fontSize.base - 1,
      color: '#374151',
      lineHeight: 1.4,
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      textAlign: 'center',
      fontSize: fontSize.base - 2,
      color: '#9ca3af',
      borderTop: 1,
      borderTopColor: '#e5e7eb',
      paddingTop: 8,
    },
  });
};

export const DynamicReportCardPDF: React.FC<DynamicReportCardPDFProps> = ({ data, template }) => {
  const { student, class: classInfo, term, school, scores, summary, attendance, teacherComment, principalComment } = data;
  const styles = createDynamicStyles(template);

  // Get enabled sections in order
  const enabledSections = template.layout.sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Helper to render section by type
  const renderSection = (sectionType: string) => {
    switch (sectionType) {
      case 'header':
        return renderHeader();
      case 'student-info':
        return renderStudentInfo();
      case 'scores-table':
        return renderScoresTable();
      case 'summary':
        return renderSummary();
      case 'attendance':
        return attendance && template.attendance?.enabled ? renderAttendance() : null;
      case 'skills':
        return null; // Skills to be implemented with actual skills data
      case 'comments':
        return renderComments();
      case 'footer':
        return renderFooter();
      default:
        return null;
    }
  };

  const renderHeader = () => {
    // Map logo position to valid alignSelf values
    const logoAlign = template.branding.logoPosition === 'center'
      ? 'center' as const
      : template.branding.logoPosition === 'right'
      ? 'flex-end' as const
      : 'flex-start' as const;

    return (
      <View style={styles.header} key="header">
        {template.branding.showLogo && school.logoUrl && (
          <Image
            src={school.logoUrl}
            style={{ width: 60, height: 60, marginBottom: 10, alignSelf: logoAlign }}
          />
        )}
        {template.branding.showSchoolName && (
          <Text style={styles.schoolName}>{school.name.toUpperCase()}</Text>
        )}
        {template.branding.showMotto && school.motto && (
          <Text style={styles.schoolMotto}>"{school.motto}"</Text>
        )}
        {template.branding.showAddress && (
          <Text style={styles.schoolAddress}>{school.address}</Text>
        )}
        <Text style={styles.reportTitle}>STUDENT REPORT CARD</Text>
      </View>
    );
  };

  const renderStudentInfo = () => (
    <View style={styles.studentInfoGrid} key="student-info">
      <View style={styles.studentInfoItem}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{`${student.firstName} ${student.lastName}`}</Text>
      </View>
      <View style={styles.studentInfoItem}>
        <Text style={styles.label}>Admission No:</Text>
        <Text style={styles.value}>{student.admissionNumber}</Text>
      </View>
      <View style={styles.studentInfoItem}>
        <Text style={styles.label}>Class:</Text>
        <Text style={styles.value}>{classInfo.name}</Text>
      </View>
      <View style={styles.studentInfoItem}>
        <Text style={styles.label}>Term:</Text>
        <Text style={styles.value}>{term.name} {term.academicYear}</Text>
      </View>
    </View>
  );

  const renderScoresTable = () => {
    const { scoresTable } = template;
    const showCA = scoresTable.showCABreakdown;

    return (
      <View key="scores-table" style={{ marginBottom: 15 }}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: '5%' }]}>#</Text>
          <Text style={[styles.tableHeaderText, { width: showCA ? '35%' : '50%' }]}>Subject</Text>
          {showCA && (
            <>
              <Text style={[styles.tableHeaderText, { width: '10%' }]}>CA1</Text>
              <Text style={[styles.tableHeaderText, { width: '10%' }]}>CA2</Text>
              <Text style={[styles.tableHeaderText, { width: '10%' }]}>CA3</Text>
              <Text style={[styles.tableHeaderText, { width: '10%' }]}>Exam</Text>
            </>
          )}
          <Text style={[styles.tableHeaderText, { width: '10%' }]}>Total</Text>
          {scoresTable.showGrade && <Text style={[styles.tableHeaderText, { width: '10%' }]}>Grade</Text>}
        </View>

        {/* Table Rows */}
        {scores.map((score, index) => (
          <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
            <Text style={[styles.tableCell, styles.tableCellLeft, { width: showCA ? '35%' : '50%' }]}>
              {score.subjectName}
            </Text>
            {showCA && (
              <>
                <Text style={[styles.tableCell, { width: '10%' }]}>{score.ca1 || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{score.ca2 || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{score.ca3 || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{score.exam || '-'}</Text>
              </>
            )}
            <Text style={[styles.tableCell, { width: '10%', fontWeight: 'bold' }]}>{score.total}</Text>
            {scoresTable.showGrade && (
              <Text style={[styles.tableCell, { width: '10%', fontWeight: 'bold' }]}>{score.grade}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderSummary = () => (
    <View style={styles.summarySection} key="summary">
      <Text style={[styles.commentTitle, { textAlign: 'center', marginBottom: 8 }]}>
        Performance Summary
      </Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Score</Text>
          <Text style={styles.summaryValue}>{summary.totalScore}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Average</Text>
          <Text style={styles.summaryValue}>{summary.averageScore.toFixed(1)}%</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Position</Text>
          <Text style={styles.summaryValue}>{summary.position}/{summary.classSize}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Subjects</Text>
          <Text style={styles.summaryValue}>{summary.numberOfSubjects}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Passed</Text>
          <Text style={styles.summaryValue}>{summary.subjectsPassed}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Grade</Text>
          <Text style={styles.summaryValue}>{summary.overallGrade}</Text>
        </View>
      </View>
    </View>
  );

  const renderAttendance = () => {
    if (!attendance) return null;

    return (
      <View style={styles.summarySection} key="attendance">
        <Text style={[styles.commentTitle, { textAlign: 'center', marginBottom: 8 }]}>
          Attendance Record
        </Text>
        <View style={styles.summaryGrid}>
          {template.attendance?.showDaysPresent && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Days Present</Text>
              <Text style={styles.summaryValue}>{attendance.presentDays}</Text>
            </View>
          )}
          {template.attendance?.showDaysAbsent && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Days Absent</Text>
              <Text style={styles.summaryValue}>{attendance.absentDays}</Text>
            </View>
          )}
          {template.attendance?.showAttendanceRate && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Attendance Rate</Text>
              <Text style={styles.summaryValue}>{attendance.attendanceRate.toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderComments = () => {
    const { comments } = template;
    if (!comments) return null;

    return (
      <View style={styles.commentSection} key="comments">
        {comments.showTeacherComment && teacherComment && (
          <View style={styles.commentBox}>
            <Text style={styles.commentTitle}>Teacher's Comment</Text>
            <Text style={styles.commentText}>{teacherComment}</Text>
            {comments.showSignature && (
              <View style={{ marginTop: 15, borderTop: 1, borderTopColor: '#9ca3af', paddingTop: 5 }}>
                <Text style={[styles.label, { textAlign: 'right' }]}>Class Teacher's Signature</Text>
              </View>
            )}
          </View>
        )}
        {comments.showPrincipalComment && principalComment && (
          <View style={styles.commentBox}>
            <Text style={styles.commentTitle}>Principal's Comment</Text>
            <Text style={styles.commentText}>{principalComment}</Text>
            {comments.showSignature && (
              <View style={{ marginTop: 15, borderTop: 1, borderTopColor: '#9ca3af', paddingTop: 5 }}>
                <Text style={[styles.label, { textAlign: 'right' }]}>Principal's Signature</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer} key="footer">
      <Text>Generated on {new Date().toLocaleDateString()}</Text>
      <Text style={{ marginTop: 2 }}>
        Next Term Begins: {term.endDate ? new Date(term.endDate as any).toLocaleDateString() : 'TBA'}
      </Text>
    </View>
  );

  return (
    <Document>
      <Page
        size={template.layout.pageSize as any}
        orientation={template.layout.orientation as any}
        style={styles.page}
      >
        {enabledSections.map(section => renderSection(section.type))}
      </Page>
    </Document>
  );
};
