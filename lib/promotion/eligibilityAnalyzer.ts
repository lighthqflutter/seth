import { PromotionSettings } from '@/types';

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  averageScore: number;
  totalSubjects: number;
  subjectsPassed: number;
  subjectsFailed: number;
  failedSubjects: string[];
  failedCoreSubjects: string[];
  attendance?: number;
}

export interface EligibilityResult {
  isEligible: boolean;
  category: 'auto_eligible' | 'auto_ineligible' | 'review_required';
  criteriaResults: {
    passedMinimumAverage: boolean;
    passedMinimumSubjects: boolean;
    passedCoreSubjects: boolean;
    passedAttendance: boolean;
  };
  failedCriteria: string[];
  passedCriteria: string[];
}

/**
 * Analyzes student eligibility for promotion based on configured criteria
 */
export function analyzeEligibility(
  student: StudentPerformance,
  settings: PromotionSettings,
  coreSubjectIds: string[]
): EligibilityResult {
  const results = {
    passedMinimumAverage: true,
    passedMinimumSubjects: true,
    passedCoreSubjects: true,
    passedAttendance: true,
  };

  const failedCriteria: string[] = [];
  const passedCriteria: string[] = [];

  // Manual mode - no automatic eligibility
  if (settings.mode === 'manual') {
    return {
      isEligible: false,
      category: 'review_required',
      criteriaResults: results,
      failedCriteria: ['Manual review required'],
      passedCriteria: [],
    };
  }

  const criteria = settings.criteria;
  if (!criteria) {
    return {
      isEligible: true,
      category: 'auto_eligible',
      criteriaResults: results,
      failedCriteria: [],
      passedCriteria: ['No criteria configured'],
    };
  }

  // Check minimum average score
  if (criteria.minimumAverageScore?.enabled) {
    if (student.averageScore >= criteria.minimumAverageScore.value) {
      passedCriteria.push(`Average score: ${student.averageScore}% (≥${criteria.minimumAverageScore.value}%)`);
    } else {
      results.passedMinimumAverage = false;
      failedCriteria.push(`Average score: ${student.averageScore}% (required: ${criteria.minimumAverageScore.value}%)`);
    }
  }

  // Check minimum subjects passed
  if (criteria.minimumSubjectsPassed?.enabled) {
    if (student.subjectsPassed >= criteria.minimumSubjectsPassed.value) {
      passedCriteria.push(`Subjects passed: ${student.subjectsPassed}/${student.totalSubjects} (≥${criteria.minimumSubjectsPassed.value})`);
    } else {
      results.passedMinimumSubjects = false;
      failedCriteria.push(`Subjects passed: ${student.subjectsPassed}/${student.totalSubjects} (required: ${criteria.minimumSubjectsPassed.value})`);
    }
  }

  // Check core subjects requirement
  if (criteria.coreSubjectsRequirement?.enabled) {
    const failedCoreCount = student.failedCoreSubjects.length;

    if (criteria.coreSubjectsRequirement.type === 'all') {
      if (failedCoreCount === 0) {
        passedCriteria.push('All core subjects passed');
      } else {
        results.passedCoreSubjects = false;
        failedCriteria.push(`Failed core subjects: ${student.failedCoreSubjects.join(', ')}`);
      }
    } else if (criteria.coreSubjectsRequirement.type === 'minimum') {
      const coreSubjectsPassed = coreSubjectIds.length - failedCoreCount;
      const required = criteria.coreSubjectsRequirement.minimumRequired || 0;

      if (coreSubjectsPassed >= required) {
        passedCriteria.push(`Core subjects passed: ${coreSubjectsPassed}/${coreSubjectIds.length}`);
      } else {
        results.passedCoreSubjects = false;
        failedCriteria.push(`Core subjects passed: ${coreSubjectsPassed}/${coreSubjectIds.length} (required: ${required})`);
      }
    }
  }

  // Check attendance requirement
  if (criteria.attendanceRequirement?.enabled && student.attendance !== undefined) {
    if (student.attendance >= criteria.attendanceRequirement.minimumPercentage) {
      passedCriteria.push(`Attendance: ${student.attendance}% (≥${criteria.attendanceRequirement.minimumPercentage}%)`);
    } else {
      results.passedAttendance = false;
      failedCriteria.push(`Attendance: ${student.attendance}% (required: ${criteria.attendanceRequirement.minimumPercentage}%)`);
    }
  }

  // Determine overall eligibility
  const allPassed = Object.values(results).every(r => r === true);

  let category: EligibilityResult['category'];
  if (allPassed) {
    category = 'auto_eligible';
  } else if (settings.mode === 'hybrid') {
    category = 'review_required';
  } else {
    category = 'auto_ineligible';
  }

  return {
    isEligible: allPassed,
    category,
    criteriaResults: results,
    failedCriteria,
    passedCriteria,
  };
}

/**
 * Categorizes students into promotion groups
 */
export function categorizeStudents(
  students: StudentPerformance[],
  settings: PromotionSettings,
  coreSubjectIds: string[]
) {
  const autoEligible: StudentPerformance[] = [];
  const reviewRequired: StudentPerformance[] = [];
  const autoIneligible: StudentPerformance[] = [];

  for (const student of students) {
    const eligibility = analyzeEligibility(student, settings, coreSubjectIds);

    if (eligibility.category === 'auto_eligible') {
      autoEligible.push(student);
    } else if (eligibility.category === 'review_required') {
      reviewRequired.push(student);
    } else {
      autoIneligible.push(student);
    }
  }

  return {
    autoEligible,
    reviewRequired,
    autoIneligible,
  };
}
