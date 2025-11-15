/**
 * PDF Generation Utilities (Phase 17)
 * Generate and download report card PDFs
 */

import { pdf } from '@react-pdf/renderer';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { calculateTermResult, determineOverallGrade, generatePerformanceRemark } from './resultCalculation';
import { getSchoolBranding, SchoolBranding } from './schoolBranding';

interface GeneratePDFOptions {
  studentId: string;
  termId: string;
  tenantId: string;
  position: number;
  classSize: number;
  teacherComment?: string;
  principalComment?: string;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
}

/**
 * Generate PDF report card for a student's term results
 */
export async function generateReportCardPDF(options: GeneratePDFOptions): Promise<Blob> {
  const { studentId, termId, tenantId, position, classSize, teacherComment, principalComment } = options;

  // Load student data
  const studentDoc = await getDoc(doc(db, 'students', studentId));
  if (!studentDoc.exists()) {
    throw new Error('Student not found');
  }
  const studentData = { id: studentDoc.id, ...studentDoc.data() } as any;

  // Load class data
  const classDoc = await getDoc(doc(db, 'classes', studentData.currentClassId));
  if (!classDoc.exists()) {
    throw new Error('Class not found');
  }
  const classData = { id: classDoc.id, ...classDoc.data() } as any;

  // Load term data
  const termDoc = await getDoc(doc(db, 'terms', termId));
  if (!termDoc.exists()) {
    throw new Error('Term not found');
  }
  const termData = { id: termDoc.id, ...termDoc.data() } as any;

  // Load grading configuration
  const gradingDoc = await getDoc(doc(db, 'gradingConfigurations', termData.gradingConfigId));
  const gradingConfig = gradingDoc.exists() ? gradingDoc.data() : { passMark: 40 };

  // Load scores
  const scoresQuery = query(
    collection(db, 'scores'),
    where('tenantId', '==', tenantId),
    where('studentId', '==', studentId),
    where('termId', '==', termId),
    where('isPublished', '==', true)
  );

  const scoresSnapshot = await getDocs(scoresQuery);
  const scoresData = scoresSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // Load subject names
  const subjectIds = [...new Set(scoresData.map(s => s.subjectId))];
  const subjects = new Map<string, any>();

  for (const subjectId of subjectIds) {
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    if (subjectDoc.exists()) {
      subjects.set(subjectId, { id: subjectDoc.id, ...subjectDoc.data() });
    }
  }

  // Load attendance data for the term
  const termStartDate = termData.startDate?.toDate ? termData.startDate.toDate() : new Date(termData.startDate);
  const termEndDate = termData.endDate?.toDate ? termData.endDate.toDate() : new Date(termData.endDate);

  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('tenantId', '==', tenantId),
    where('studentId', '==', studentId)
  );

  const attendanceSnapshot = await getDocs(attendanceQuery);
  const attendanceRecords = attendanceSnapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: data.date.toDate ? data.date.toDate() : new Date(data.date),
        status: data.status as string,
      };
    })
    .filter(record =>
      record.date >= termStartDate && record.date <= termEndDate
    );

  // Calculate attendance statistics
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(r =>
    ['present', 'late'].includes(r.status)
  ).length;
  const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
  const excusedDays = attendanceRecords.filter(r =>
    ['excused', 'sick', 'permission'].includes(r.status)
  ).length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

  const attendance: AttendanceSummary = {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    excusedDays,
    attendanceRate,
  };

  // Prepare scores with subject names
  const scores = scoresData.map(score => ({
    subjectId: score.subjectId,
    subjectName: subjects.get(score.subjectId)?.name || 'Unknown Subject',
    total: score.total,
    percentage: score.percentage,
    grade: score.grade,
    maxScore: 100,
    isAbsent: score.isAbsent || false,
    isExempted: score.isExempted || false,
  }));

  // Calculate result summary
  const termResult = calculateTermResult(scores, {
    passMark: gradingConfig.passMark,
  });

  const overallGrade = determineOverallGrade(termResult.averageScore);

  const remark = generatePerformanceRemark(
    termResult.averageScore,
    position,
    classSize,
    termResult.subjectsPassed,
    termResult.subjectsFailed
  );

  const summary = {
    ...termResult,
    position,
    classSize,
    overallGrade,
    remark,
  };

  // Get school branding
  const schoolBranding = await getSchoolBranding(tenantId);

  // Prepare data for PDF
  const reportCardData = {
    student: {
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      admissionNumber: studentData.admissionNumber,
      gender: studentData.gender,
      dateOfBirth: studentData.dateOfBirth,
    },
    class: {
      name: classData.name,
      level: classData.level,
    },
    term: {
      name: termData.name,
      academicYear: termData.academicYear,
      startDate: termData.startDate,
      endDate: termData.endDate,
    },
    school: schoolBranding,
    scores,
    summary,
    attendance,
    teacherComment,
    principalComment,
  };

  // Dynamically import the PDF component to avoid SSR issues
  const { ReportCardPDF } = await import('@/components/pdf/ReportCardPDF');
  const ReportCardElement = ReportCardPDF({ data: reportCardData });

  // Generate PDF blob
  const blob = await pdf(ReportCardElement as any).toBlob();
  return blob;
}

/**
 * Download PDF report card
 */
export async function downloadReportCard(
  options: GeneratePDFOptions,
  fileName?: string
): Promise<void> {
  try {
    const blob = await generateReportCardPDF(options);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `report-card-${options.studentId}-${options.termId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report card:', error);
    throw error;
  }
}

/**
 * Generate multiple report cards (bulk download)
 */
export async function generateBulkReportCards(
  students: Array<{
    studentId: string;
    position: number;
    teacherComment?: string;
  }>,
  termId: string,
  tenantId: string,
  classSize: number,
  principalComment?: string
): Promise<Blob[]> {
  const pdfs: Blob[] = [];

  for (const student of students) {
    try {
      const blob = await generateReportCardPDF({
        studentId: student.studentId,
        termId,
        tenantId,
        position: student.position,
        classSize,
        teacherComment: student.teacherComment,
        principalComment,
      });
      pdfs.push(blob);
    } catch (error) {
      console.error(`Error generating PDF for student ${student.studentId}:`, error);
      // Continue with other students
    }
  }

  return pdfs;
}

/**
 * Download bulk report cards as separate files
 */
export async function downloadBulkReportCards(
  students: Array<{
    studentId: string;
    studentName: string;
    position: number;
    teacherComment?: string;
  }>,
  termId: string,
  termName: string,
  tenantId: string,
  classSize: number,
  principalComment?: string
): Promise<void> {
  for (const student of students) {
    try {
      await downloadReportCard(
        {
          studentId: student.studentId,
          termId,
          tenantId,
          position: student.position,
          classSize,
          teacherComment: student.teacherComment,
          principalComment,
        },
        `${student.studentName.replace(/\s+/g, '_')}_${termName.replace(/\s+/g, '_')}_Report.pdf`
      );

      // Add small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error downloading report card for ${student.studentName}:`, error);
      // Continue with other students
    }
  }
}

/**
 * Preview report card (opens in new tab)
 */
export async function previewReportCard(options: GeneratePDFOptions): Promise<void> {
  try {
    const blob = await generateReportCardPDF(options);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up after a delay (user might still be viewing)
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // 1 minute
  } catch (error) {
    console.error('Error previewing report card:', error);
    throw error;
  }
}
