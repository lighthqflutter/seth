import { TenantSettings } from '@/types';

/**
 * Configuration Presets for Different School Types
 *
 * Schools can choose from these presets during onboarding or customize fully.
 * Each preset represents common configurations for different education systems.
 */

// ============================================
// PRESET 1: Nigerian Secondary School (Standard - Most Common)
// ============================================
export const NIGERIAN_STANDARD: TenantSettings = {
  assessment: {
    numberOfCAs: 3,
    caConfigs: [
      { name: 'CA1', maxScore: 10, isOptional: false },
      { name: 'CA2', maxScore: 10, isOptional: false },
      { name: 'CA3', maxScore: 10, isOptional: false },
    ],
    exam: {
      enabled: true,
      name: 'Examination',
      maxScore: 70,
    },
    project: {
      enabled: false,
      name: 'Project',
      maxScore: 0,
      isOptional: true,
    },
    calculationMethod: 'sum',
    totalMaxScore: 100,
  },
  grading: {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A1', minScore: 75, maxScore: 100, description: 'Excellent', color: '#16a34a' },
      { grade: 'B2', minScore: 70, maxScore: 74, description: 'Very Good', color: '#65a30d' },
      { grade: 'B3', minScore: 65, maxScore: 69, description: 'Good', color: '#84cc16' },
      { grade: 'C4', minScore: 60, maxScore: 64, description: 'Credit', color: '#eab308' },
      { grade: 'C5', minScore: 55, maxScore: 59, description: 'Credit', color: '#f59e0b' },
      { grade: 'C6', minScore: 50, maxScore: 54, description: 'Credit', color: '#f97316' },
      { grade: 'D7', minScore: 45, maxScore: 49, description: 'Pass', color: '#ef4444' },
      { grade: 'E8', minScore: 40, maxScore: 44, description: 'Pass', color: '#dc2626' },
      { grade: 'F9', minScore: 0, maxScore: 39, description: 'Fail', color: '#991b1b' },
    ],
    passMark: 40,
    distinctionMark: 75,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: true,
      showRemark: true,
    },
  },
  reportCard: {
    template: 'standard',
    branding: {
      schoolName: '',
      schoolAddress: '',
      schoolColor: '#2563eb',
    },
    sections: {
      studentInfo: true,
      attendanceInfo: true,
      subjectScores: true,
      skillsRating: true,
      conductRating: true,
      teacherComments: true,
      principalComments: true,
      classTeacherComments: true,
      nextTermInfo: true,
      performanceChart: false,
      termHistory: false,
    },
    comments: {
      maxLength: 500,
      required: false,
      autoGenerate: false,
    },
    affectiveDomains: [
      { name: 'Punctuality', scale: '1-5', scaleValues: ['5', '4', '3', '2', '1'] },
      { name: 'Neatness', scale: '1-5', scaleValues: ['5', '4', '3', '2', '1'] },
      { name: 'Politeness', scale: '1-5', scaleValues: ['5', '4', '3', '2', '1'] },
      { name: 'Honesty', scale: '1-5', scaleValues: ['5', '4', '3', '2', '1'] },
      { name: 'Leadership', scale: '1-5', scaleValues: ['5', '4', '3', '2', '1'] },
    ],
  },
  academicCalendar: {
    termsPerYear: 3,
    currentAcademicYear: '2024/2025',
    termNamingPattern: 'ordinal',
    weekNumbering: false,
    trackHolidays: false,
  },
  subjects: {
    allowCustomMaxScores: false,
    categories: [
      { name: 'Core', color: '#2563eb', requiredCount: 5 },
      { name: 'Elective', color: '#7c3aed', requiredCount: 4 },
    ],
    allowSubjectSpecificAssessments: false,
  },
  classLevels: {
    levels: [
      { code: 'JSS1', displayName: 'Junior Secondary 1', order: 1, category: 'Junior' },
      { code: 'JSS2', displayName: 'Junior Secondary 2', order: 2, category: 'Junior' },
      { code: 'JSS3', displayName: 'Junior Secondary 3', order: 3, category: 'Junior' },
      { code: 'SS1', displayName: 'Senior Secondary 1', order: 4, category: 'Senior' },
      { code: 'SS2', displayName: 'Senior Secondary 2', order: 5, category: 'Senior' },
      { code: 'SS3', displayName: 'Senior Secondary 3', order: 6, category: 'Senior' },
    ],
    promotionCriteria: {
      minimumPassSubjects: 5,
      minimumAverageScore: 40,
      coreSubjectsMustPass: true,
      coreSubjects: ['MATH', 'ENG', 'PHY', 'CHEM', 'BIO'],
    },
  },
  scoreEntry: {
    entryMethod: 'percentage',
    validation: {
      allowDecimal: true,
      allowZero: true,
      allowAbsent: true,
      warnOnOutliers: true,
    },
    workflow: {
      requireApproval: false,
      allowEdit: true,
      allowDelete: false,
      lockAfterDays: 30,
    },
    bulkEntry: {
      enableCSVImport: true,
      enableExcelImport: true,
      templateFormat: 'simple',
    },
  },
};

// ============================================
// PRESET 2: Nigerian Secondary School (Modern)
// ============================================
export const NIGERIAN_MODERN: TenantSettings = {
  ...NIGERIAN_STANDARD,
  assessment: {
    numberOfCAs: 3,
    caConfigs: [
      { name: 'CA1', maxScore: 15, isOptional: false },
      { name: 'CA2', maxScore: 10, isOptional: false },
      { name: 'CA3', maxScore: 15, isOptional: false },
    ],
    exam: {
      enabled: true,
      name: 'Examination',
      maxScore: 60,
    },
    project: {
      enabled: false,
      name: 'Project',
      maxScore: 0,
      isOptional: true,
    },
    calculationMethod: 'sum',
    totalMaxScore: 100,
  },
  grading: {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A', minScore: 90, maxScore: 100, gpa: 4.0, description: 'Excellent', color: '#16a34a' },
      { grade: 'B', minScore: 80, maxScore: 89, gpa: 3.0, description: 'Very Good', color: '#84cc16' },
      { grade: 'C', minScore: 70, maxScore: 79, gpa: 2.5, description: 'Good', color: '#eab308' },
      { grade: 'D', minScore: 60, maxScore: 69, gpa: 2.0, description: 'Pass', color: '#f59e0b' },
      { grade: 'E', minScore: 50, maxScore: 59, gpa: 1.0, description: 'Pass', color: '#ef4444' },
      { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0, description: 'Fail', color: '#991b1b' },
    ],
    passMark: 50,
    distinctionMark: 80,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: true,
      showPosition: true,
      showRemark: true,
    },
  },
};

// ============================================
// PRESET 3: International School (IB-Style)
// ============================================
export const INTERNATIONAL_IB: TenantSettings = {
  assessment: {
    numberOfCAs: 4,
    caConfigs: [
      { name: 'Assessment 1', maxScore: 100, weight: 10, isOptional: false },
      { name: 'Assessment 2', maxScore: 100, weight: 10, isOptional: false },
      { name: 'Assessment 3', maxScore: 100, weight: 10, isOptional: false },
      { name: 'Mid-term', maxScore: 100, weight: 20, isOptional: false },
    ],
    exam: {
      enabled: true,
      name: 'Final Examination',
      maxScore: 100,
      weight: 50,
    },
    project: {
      enabled: false,
      name: 'Project',
      maxScore: 0,
      isOptional: true,
    },
    calculationMethod: 'weighted_average',
    totalMaxScore: 100,
  },
  grading: {
    system: 'numeric',
    gradeBoundaries: [
      { grade: '7', minScore: 90, maxScore: 100, description: 'Excellent', color: '#16a34a' },
      { grade: '6', minScore: 80, maxScore: 89, description: 'Very Good', color: '#65a30d' },
      { grade: '5', minScore: 70, maxScore: 79, description: 'Good', color: '#84cc16' },
      { grade: '4', minScore: 60, maxScore: 69, description: 'Satisfactory', color: '#eab308' },
      { grade: '3', minScore: 50, maxScore: 59, description: 'Mediocre', color: '#f59e0b' },
      { grade: '2', minScore: 40, maxScore: 49, description: 'Poor', color: '#ef4444' },
      { grade: '1', minScore: 0, maxScore: 39, description: 'Very Poor', color: '#991b1b' },
    ],
    passMark: 60,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: false,
      showRemark: true,
    },
  },
  reportCard: {
    template: 'detailed',
    branding: {
      schoolName: '',
      schoolAddress: '',
      schoolColor: '#2563eb',
    },
    sections: {
      studentInfo: true,
      attendanceInfo: true,
      subjectScores: true,
      skillsRating: true,
      conductRating: true,
      teacherComments: true,
      principalComments: false,
      classTeacherComments: true,
      nextTermInfo: false,
      performanceChart: true,
      termHistory: true,
    },
    comments: {
      maxLength: 1000,
      required: true,
      autoGenerate: false,
    },
  },
  academicCalendar: {
    termsPerYear: 2,
    currentAcademicYear: '2024/2025',
    termNamingPattern: 'seasonal',
    customTermNames: ['Fall', 'Spring'],
    weekNumbering: true,
    trackHolidays: true,
  },
  subjects: {
    allowCustomMaxScores: true,
    categories: [
      { name: 'Core', color: '#2563eb', requiredCount: 6 },
      { name: 'Elective', color: '#7c3aed', requiredCount: 2 },
      { name: 'Extra-Curricular', color: '#06b6d4' },
    ],
    allowSubjectSpecificAssessments: true,
  },
  classLevels: {
    levels: [
      { code: 'GRADE1', displayName: 'Grade 1', order: 1, category: 'Elementary' },
      { code: 'GRADE2', displayName: 'Grade 2', order: 2, category: 'Elementary' },
      { code: 'GRADE3', displayName: 'Grade 3', order: 3, category: 'Elementary' },
      { code: 'GRADE4', displayName: 'Grade 4', order: 4, category: 'Elementary' },
      { code: 'GRADE5', displayName: 'Grade 5', order: 5, category: 'Elementary' },
      { code: 'GRADE6', displayName: 'Grade 6', order: 6, category: 'Middle' },
      { code: 'GRADE7', displayName: 'Grade 7', order: 7, category: 'Middle' },
      { code: 'GRADE8', displayName: 'Grade 8', order: 8, category: 'Middle' },
      { code: 'GRADE9', displayName: 'Grade 9', order: 9, category: 'High' },
      { code: 'GRADE10', displayName: 'Grade 10', order: 10, category: 'High' },
      { code: 'GRADE11', displayName: 'Grade 11', order: 11, category: 'High' },
      { code: 'GRADE12', displayName: 'Grade 12', order: 12, category: 'High' },
    ],
    promotionCriteria: {
      minimumPassSubjects: 6,
      minimumAverageScore: 60,
      coreSubjectsMustPass: true,
      coreSubjects: ['MATH', 'ENG', 'SCI', 'HIST'],
    },
  },
  scoreEntry: {
    entryMethod: 'percentage',
    validation: {
      allowDecimal: true,
      allowZero: true,
      allowAbsent: true,
      warnOnOutliers: true,
    },
    workflow: {
      requireApproval: true,
      allowEdit: true,
      allowDelete: false,
      lockAfterDays: 14,
    },
    bulkEntry: {
      enableCSVImport: true,
      enableExcelImport: true,
      templateFormat: 'detailed',
    },
  },
};

// ============================================
// PRESET 4: British Curriculum (GCSE/A-Level Style)
// ============================================
export const BRITISH_CURRICULUM: TenantSettings = {
  assessment: {
    numberOfCAs: 2,
    caConfigs: [
      { name: 'Coursework 1', maxScore: 20, isOptional: false },
      { name: 'Coursework 2', maxScore: 20, isOptional: false },
    ],
    exam: {
      enabled: true,
      name: 'Final Examination',
      maxScore: 60,
    },
    project: {
      enabled: false,
      name: 'Project',
      maxScore: 0,
      isOptional: true,
    },
    calculationMethod: 'sum',
    totalMaxScore: 100,
  },
  grading: {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A*', minScore: 90, maxScore: 100, description: 'Outstanding', color: '#16a34a' },
      { grade: 'A', minScore: 80, maxScore: 89, description: 'Excellent', color: '#65a30d' },
      { grade: 'B', minScore: 70, maxScore: 79, description: 'Good', color: '#84cc16' },
      { grade: 'C', minScore: 60, maxScore: 69, description: 'Satisfactory', color: '#eab308' },
      { grade: 'D', minScore: 50, maxScore: 59, description: 'Pass', color: '#f59e0b' },
      { grade: 'E', minScore: 40, maxScore: 49, description: 'Pass', color: '#f97316' },
      { grade: 'U', minScore: 0, maxScore: 39, description: 'Ungraded', color: '#991b1b' },
    ],
    passMark: 40,
    distinctionMark: 80,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: false,
      showRemark: true,
    },
  },
  reportCard: {
    template: 'standard',
    branding: {
      schoolName: '',
      schoolAddress: '',
      schoolColor: '#2563eb',
    },
    sections: {
      studentInfo: true,
      attendanceInfo: true,
      subjectScores: true,
      skillsRating: false,
      conductRating: false,
      teacherComments: true,
      principalComments: false,
      classTeacherComments: true,
      nextTermInfo: true,
      performanceChart: false,
      termHistory: false,
    },
    comments: {
      maxLength: 500,
      required: true,
      autoGenerate: false,
    },
  },
  academicCalendar: {
    termsPerYear: 3,
    currentAcademicYear: '2024/2025',
    termNamingPattern: 'ordinal',
    customTermNames: ['Autumn Term', 'Spring Term', 'Summer Term'],
    weekNumbering: false,
    trackHolidays: true,
  },
  subjects: {
    allowCustomMaxScores: false,
    categories: [
      { name: 'Core', color: '#2563eb', requiredCount: 5 },
      { name: 'Foundation', color: '#7c3aed', requiredCount: 3 },
      { name: 'Optional', color: '#06b6d4' },
    ],
    allowSubjectSpecificAssessments: false,
  },
  classLevels: {
    levels: [
      { code: 'YEAR7', displayName: 'Year 7', order: 7, category: 'Secondary' },
      { code: 'YEAR8', displayName: 'Year 8', order: 8, category: 'Secondary' },
      { code: 'YEAR9', displayName: 'Year 9', order: 9, category: 'Secondary' },
      { code: 'YEAR10', displayName: 'Year 10 (GCSE)', order: 10, category: 'GCSE' },
      { code: 'YEAR11', displayName: 'Year 11 (GCSE)', order: 11, category: 'GCSE' },
      { code: 'YEAR12', displayName: 'Year 12 (A-Level)', order: 12, category: 'A-Level' },
      { code: 'YEAR13', displayName: 'Year 13 (A-Level)', order: 13, category: 'A-Level' },
    ],
    promotionCriteria: {
      minimumPassSubjects: 5,
      minimumAverageScore: 40,
      coreSubjectsMustPass: true,
      coreSubjects: ['MATH', 'ENG', 'SCI'],
    },
  },
  scoreEntry: {
    entryMethod: 'percentage',
    validation: {
      allowDecimal: true,
      allowZero: true,
      allowAbsent: true,
      warnOnOutliers: true,
    },
    workflow: {
      requireApproval: false,
      allowEdit: true,
      allowDelete: false,
      lockAfterDays: 21,
    },
    bulkEntry: {
      enableCSVImport: true,
      enableExcelImport: true,
      templateFormat: 'simple',
    },
  },
};

// ============================================
// PRESET 5: American System
// ============================================
export const AMERICAN_SYSTEM: TenantSettings = {
  assessment: {
    numberOfCAs: 4,
    caConfigs: [
      { name: 'Quarter 1', maxScore: 100, weight: 20, isOptional: false },
      { name: 'Quarter 2', maxScore: 100, weight: 20, isOptional: false },
      { name: 'Quarter 3', maxScore: 100, weight: 20, isOptional: false },
      { name: 'Quarter 4', maxScore: 100, weight: 20, isOptional: false },
    ],
    exam: {
      enabled: true,
      name: 'Final Exam',
      maxScore: 100,
      weight: 20,
    },
    project: {
      enabled: false,
      name: 'Project',
      maxScore: 0,
      isOptional: true,
    },
    calculationMethod: 'weighted_average',
    totalMaxScore: 100,
  },
  grading: {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A+', minScore: 97, maxScore: 100, gpa: 4.0, description: 'Outstanding', color: '#16a34a' },
      { grade: 'A', minScore: 93, maxScore: 96, gpa: 4.0, description: 'Excellent', color: '#16a34a' },
      { grade: 'A-', minScore: 90, maxScore: 92, gpa: 3.7, description: 'Excellent', color: '#65a30d' },
      { grade: 'B+', minScore: 87, maxScore: 89, gpa: 3.3, description: 'Good', color: '#84cc16' },
      { grade: 'B', minScore: 83, maxScore: 86, gpa: 3.0, description: 'Good', color: '#84cc16' },
      { grade: 'B-', minScore: 80, maxScore: 82, gpa: 2.7, description: 'Good', color: '#a3e635' },
      { grade: 'C+', minScore: 77, maxScore: 79, gpa: 2.3, description: 'Satisfactory', color: '#eab308' },
      { grade: 'C', minScore: 73, maxScore: 76, gpa: 2.0, description: 'Satisfactory', color: '#eab308' },
      { grade: 'C-', minScore: 70, maxScore: 72, gpa: 1.7, description: 'Satisfactory', color: '#f59e0b' },
      { grade: 'D+', minScore: 67, maxScore: 69, gpa: 1.3, description: 'Pass', color: '#f97316' },
      { grade: 'D', minScore: 63, maxScore: 66, gpa: 1.0, description: 'Pass', color: '#ef4444' },
      { grade: 'D-', minScore: 60, maxScore: 62, gpa: 0.7, description: 'Pass', color: '#dc2626' },
      { grade: 'F', minScore: 0, maxScore: 59, gpa: 0.0, description: 'Fail', color: '#991b1b' },
    ],
    passMark: 60,
    distinctionMark: 90,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: true,
      showPosition: false,
      showRemark: true,
    },
  },
  reportCard: {
    template: 'standard',
    branding: {
      schoolName: '',
      schoolAddress: '',
      schoolColor: '#2563eb',
    },
    sections: {
      studentInfo: true,
      attendanceInfo: true,
      subjectScores: true,
      skillsRating: false,
      conductRating: false,
      teacherComments: true,
      principalComments: false,
      classTeacherComments: false,
      nextTermInfo: false,
      performanceChart: true,
      termHistory: true,
    },
    comments: {
      maxLength: 500,
      required: false,
      autoGenerate: false,
    },
  },
  academicCalendar: {
    termsPerYear: 2,
    currentAcademicYear: '2024/2025',
    termNamingPattern: 'seasonal',
    customTermNames: ['Fall Semester', 'Spring Semester'],
    weekNumbering: false,
    trackHolidays: true,
  },
  subjects: {
    allowCustomMaxScores: false,
    categories: [
      { name: 'Core', color: '#2563eb', requiredCount: 4 },
      { name: 'Elective', color: '#7c3aed', requiredCount: 3 },
      { name: 'AP/Honors', color: '#16a34a' },
    ],
    allowSubjectSpecificAssessments: false,
  },
  classLevels: {
    levels: [
      { code: 'GRADE9', displayName: 'Freshman (Grade 9)', order: 9, category: 'High School' },
      { code: 'GRADE10', displayName: 'Sophomore (Grade 10)', order: 10, category: 'High School' },
      { code: 'GRADE11', displayName: 'Junior (Grade 11)', order: 11, category: 'High School' },
      { code: 'GRADE12', displayName: 'Senior (Grade 12)', order: 12, category: 'High School' },
    ],
    promotionCriteria: {
      minimumPassSubjects: 4,
      minimumAverageScore: 60,
      coreSubjectsMustPass: true,
      coreSubjects: ['MATH', 'ENG', 'SCI', 'HIST'],
    },
  },
  scoreEntry: {
    entryMethod: 'percentage',
    validation: {
      allowDecimal: true,
      allowZero: true,
      allowAbsent: true,
      warnOnOutliers: true,
    },
    workflow: {
      requireApproval: false,
      allowEdit: true,
      allowDelete: false,
      lockAfterDays: 30,
    },
    bulkEntry: {
      enableCSVImport: true,
      enableExcelImport: true,
      templateFormat: 'simple',
    },
  },
};

// ============================================
// PRESET REGISTRY
// ============================================
export const CONFIG_PRESETS = {
  NIGERIAN_STANDARD,
  NIGERIAN_MODERN,
  INTERNATIONAL_IB,
  BRITISH_CURRICULUM,
  AMERICAN_SYSTEM,
};

export type PresetKey = keyof typeof CONFIG_PRESETS;

export const PRESET_METADATA: Record<PresetKey, { name: string; description: string; region: string }> = {
  NIGERIAN_STANDARD: {
    name: 'Nigerian Standard',
    description: 'Traditional 3 CAs (10 marks each) + Exam (70 marks) with A1-F9 grading',
    region: 'Nigeria',
  },
  NIGERIAN_MODERN: {
    name: 'Nigerian Modern',
    description: 'Modern 3 CAs (15+10+15) + Exam (60 marks) with A-F grading and GPA',
    region: 'Nigeria',
  },
  INTERNATIONAL_IB: {
    name: 'International (IB-Style)',
    description: 'Weighted assessments with 1-7 grading scale, ideal for international schools',
    region: 'International',
  },
  BRITISH_CURRICULUM: {
    name: 'British Curriculum',
    description: 'Coursework + Exam with A*-U grading system (GCSE/A-Level)',
    region: 'United Kingdom',
  },
  AMERICAN_SYSTEM: {
    name: 'American System',
    description: 'Quarterly grading with A-F and GPA system',
    region: 'United States',
  },
};

/**
 * Get a configuration preset by key
 */
export function getPreset(key: PresetKey): TenantSettings {
  return CONFIG_PRESETS[key];
}

/**
 * Get all available presets with metadata
 */
export function getAllPresets() {
  return Object.entries(CONFIG_PRESETS).map(([key, config]) => ({
    key: key as PresetKey,
    config,
    metadata: PRESET_METADATA[key as PresetKey],
  }));
}
