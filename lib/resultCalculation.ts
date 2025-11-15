/**
 * Result Calculation System
 * Phase 12: Aggregate scores across subjects, calculate positions, generate report cards
 *
 * Handles:
 * - Term result calculation (average, total, pass/fail count)
 * - Class position ranking
 * - Overall grade determination
 * - Performance remarks
 */

import { GradeBoundary } from '@/types';

export interface SubjectScore {
  subjectId: string;
  subjectName: string;
  total: number;
  percentage: number;
  grade: string;
  maxScore: number;
  isAbsent?: boolean;
  isExempted?: boolean;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  totalScore: number;
  averageScore: number;
  numberOfSubjects: number;
  position?: number;
  subjectsPassed?: number;
  subjectsFailed?: number;
}

export interface TermResultCalculation {
  totalScore: number;
  averageScore: number;
  numberOfSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
}

export interface ResultSummary extends TermResultCalculation {
  position: number;
  classSize: number;
  overallGrade: string;
  remark: string;
}

export interface CalculationOptions {
  passMark?: number;
  gradeBoundaries?: GradeBoundary[];
}

/**
 * Calculate term result from all subject scores
 */
export function calculateTermResult(
  scores: SubjectScore[],
  options: CalculationOptions = {}
): TermResultCalculation {
  const passMark = options.passMark ?? 40;

  // Filter out absent and exempted subjects
  const validScores = scores.filter(s => !s.isAbsent && !s.isExempted);

  if (validScores.length === 0) {
    return {
      totalScore: 0,
      averageScore: 0,
      numberOfSubjects: 0,
      subjectsPassed: 0,
      subjectsFailed: 0,
    };
  }

  // Calculate totals
  const totalScore = validScores.reduce((sum, score) => sum + score.total, 0);

  // Average should be based on percentage to handle different max scores
  const averagePercentage = validScores.reduce((sum, score) => sum + score.percentage, 0) / validScores.length;

  // Count passes and failures
  const subjectsPassed = validScores.filter(s => s.percentage >= passMark).length;
  const subjectsFailed = validScores.filter(s => s.percentage < passMark).length;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    averageScore: Math.round(averagePercentage * 100) / 100,
    numberOfSubjects: validScores.length,
    subjectsPassed,
    subjectsFailed,
  };
}

/**
 * Calculate class positions for all students
 * Ranks students by total score (descending), with average as tiebreaker
 */
export function calculateClassPositions(students: StudentResult[]): StudentResult[] {
  if (students.length === 0) {
    return [];
  }

  // Sort by totalScore descending, then by averageScore descending
  const sortedStudents = [...students].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return b.averageScore - a.averageScore;
  });

  // Assign positions (handling ties)
  let currentPosition = 1;
  let previousScore = sortedStudents[0].totalScore;
  let previousAverage = sortedStudents[0].averageScore;
  let studentsAtPosition = 0;

  return sortedStudents.map((student, index) => {
    if (student.totalScore < previousScore ||
        (student.totalScore === previousScore && student.averageScore < previousAverage)) {
      // Different score, move to next position
      currentPosition = index + 1;
    }

    previousScore = student.totalScore;
    previousAverage = student.averageScore;

    return {
      ...student,
      position: currentPosition,
    };
  });
}

/**
 * Determine overall grade based on average percentage
 */
export function determineOverallGrade(
  averagePercentage: number,
  gradeBoundaries?: GradeBoundary[]
): string {
  // Default grade boundaries (Nigerian system)
  const defaultBoundaries: GradeBoundary[] = [
    { grade: 'A1', minScore: 75, maxScore: 100 },
    { grade: 'B2', minScore: 70, maxScore: 74 },
    { grade: 'B3', minScore: 65, maxScore: 69 },
    { grade: 'C4', minScore: 60, maxScore: 64 },
    { grade: 'C5', minScore: 55, maxScore: 59 },
    { grade: 'C6', minScore: 50, maxScore: 54 },
    { grade: 'D7', minScore: 45, maxScore: 49 },
    { grade: 'E8', minScore: 40, maxScore: 44 },
    { grade: 'F9', minScore: 0, maxScore: 39 },
  ];

  const boundaries = gradeBoundaries || defaultBoundaries;

  for (const boundary of boundaries) {
    if (averagePercentage >= boundary.minScore && averagePercentage <= boundary.maxScore) {
      return boundary.grade;
    }
  }

  // Default to lowest grade
  return boundaries[boundaries.length - 1]?.grade || 'F';
}

/**
 * Generate performance remark based on average and position
 */
export function generatePerformanceRemark(
  averagePercentage: number,
  position: number,
  classSize: number,
  subjectsPassed: number,
  subjectsFailed: number
): string {
  // Top 10% of class
  if (position <= Math.ceil(classSize * 0.1)) {
    if (averagePercentage >= 75) {
      return 'Excellent performance! Keep up the outstanding work.';
    } else if (averagePercentage >= 65) {
      return 'Very good performance. Continue working hard.';
    }
  }

  // Top 25% of class
  if (position <= Math.ceil(classSize * 0.25)) {
    return 'Good performance. Keep striving for excellence.';
  }

  // Middle 50%
  if (position <= Math.ceil(classSize * 0.75)) {
    if (subjectsFailed > 0) {
      return `Satisfactory performance but needs improvement in ${subjectsFailed} subject(s). Work harder.`;
    }
    return 'Satisfactory performance. More effort is needed to excel.';
  }

  // Bottom 25%
  if (subjectsFailed > 3) {
    return `Poor performance. Failed ${subjectsFailed} subjects. Student must improve significantly.`;
  } else if (subjectsFailed > 0) {
    return `Fair performance. Student must improve in ${subjectsFailed} subject(s).`;
  }

  return 'Student needs to work harder to improve performance.';
}

/**
 * Generate complete result summary
 */
export function generateResultSummary(
  scores: SubjectScore[],
  context: {
    position: number;
    classSize: number;
    passMark?: number;
    gradeBoundaries?: GradeBoundary[];
  }
): ResultSummary {
  const termResult = calculateTermResult(scores, {
    passMark: context.passMark,
  });

  const overallGrade = determineOverallGrade(
    termResult.averageScore,
    context.gradeBoundaries
  );

  const remark = generatePerformanceRemark(
    termResult.averageScore,
    context.position,
    context.classSize,
    termResult.subjectsPassed,
    termResult.subjectsFailed
  );

  return {
    ...termResult,
    position: context.position,
    classSize: context.classSize,
    overallGrade,
    remark,
  };
}

/**
 * Get ordinal suffix for position (1st, 2nd, 3rd, etc.)
 */
export function getPositionSuffix(position: number): string {
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
}
