import { Timestamp } from 'firebase/firestore';

// ============================================
// CONFIGURATION INTERFACES
// ============================================

export interface CAConfig {
  name: string; // e.g., "CA1", "Test 1", "Quiz 1"
  maxScore: number; // e.g., 10, 15, 20
  weight?: number; // Optional weight percentage (if using weighted average)
  isOptional: boolean; // Some schools make certain CAs optional
}

export interface ExamConfig {
  enabled: boolean;
  name: string; // e.g., "End of Term Exam", "Final Exam"
  maxScore: number; // e.g., 60, 70, 100
  weight?: number;
}

export interface ProjectConfig {
  enabled: boolean;
  name: string; // e.g., "Project", "Assignment", "Practical"
  maxScore: number;
  weight?: number;
  isOptional: boolean;
}

export interface CustomAssessment {
  id: string;
  name: string; // e.g., "Attendance", "Conduct", "Presentation"
  maxScore: number;
  weight?: number;
  isOptional: boolean;
}

export interface AssessmentConfig {
  // Number of CAs per term (flexible: 0-10)
  numberOfCAs: number;

  // Each CA configuration
  caConfigs: CAConfig[];

  // Exam configuration
  exam: ExamConfig;

  // Project/Assignment configuration
  project: ProjectConfig;

  // Additional assessment types (for flexibility)
  customAssessments?: CustomAssessment[];

  // Calculation method
  calculationMethod: 'sum' | 'weighted_average' | 'best_of_n' | 'custom';

  // For 'best_of_n': take best N scores out of M assessments
  bestOfN?: {
    take: number; // Take best N
    from: number; // From M assessments
  };

  // Total possible score
  totalMaxScore: number;
}

export interface GradeBoundary {
  grade: string; // e.g., "A", "1", "Excellent"
  minScore: number; // Minimum score (inclusive)
  maxScore: number; // Maximum score (inclusive)
  gpa?: number; // Grade Point Average (optional)
  description?: string; // e.g., "Excellent", "Very Good"
  color?: string; // For UI display
}

export interface GradingConfig {
  // Grading system type
  system: 'letter' | 'numeric' | 'percentage' | 'custom';

  // Grade boundaries (for letter/numeric systems)
  gradeBoundaries: GradeBoundary[];

  // Pass mark
  passMark: number;

  // Honors/Distinctions
  distinctionMark?: number;

  // Display preferences
  displayPreference: {
    showPercentage: boolean;
    showGrade: boolean;
    showGPA: boolean;
    showPosition: boolean;
    showRemark: boolean;
  };
}

export interface ReportCardConfig {
  // Report card template
  template: 'standard' | 'detailed' | 'minimal' | 'custom';

  // School branding
  branding: {
    schoolName: string;
    schoolAddress: string;
    schoolLogo?: string;
    schoolMotto?: string;
    schoolColor: string;
    principalName?: string;
    principalSignature?: string;
  };

  // What to display
  sections: {
    studentInfo: boolean;
    attendanceInfo: boolean;
    subjectScores: boolean;
    skillsRating: boolean;
    conductRating: boolean;
    teacherComments: boolean;
    principalComments: boolean;
    classTeacherComments: boolean;
    nextTermInfo: boolean;
    performanceChart: boolean;
    termHistory: boolean;
  };

  // Comments configuration
  comments: {
    maxLength: number;
    required: boolean;
    autoGenerate: boolean;
  };

  // Skills/Affective domain configuration
  affectiveDomains?: Array<{
    name: string;
    scale: string;
    scaleValues: string[];
  }>;

  // Additional info to display
  additionalInfo?: {
    schoolCalendar: boolean;
    feeInformation: boolean;
    contactInformation: boolean;
  };
}

export interface AcademicCalendarConfig {
  termsPerYear: number;
  currentAcademicYear: string;
  termNamingPattern: 'ordinal' | 'seasonal' | 'custom';
  customTermNames?: string[];
  weekNumbering: boolean;
  trackHolidays: boolean;
}

export interface SubjectConfig {
  allowCustomMaxScores: boolean;
  categories: Array<{
    name: string;
    color: string;
    requiredCount?: number;
  }>;
  allowSubjectSpecificAssessments: boolean;
}

export interface ClassLevelConfig {
  levels: Array<{
    code: string;
    displayName: string;
    order: number;
    category: string;
  }>;
  promotionCriteria: {
    minimumPassSubjects: number;
    minimumAverageScore: number;
    coreSubjectsMustPass: boolean;
    coreSubjects: string[];
  };
}

export interface ScoreEntryConfig {
  entryMethod: 'percentage' | 'points' | 'grade';
  validation: {
    allowDecimal: boolean;
    allowZero: boolean;
    allowAbsent: boolean;
    warnOnOutliers: boolean;
  };
  workflow: {
    requireApproval: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    lockAfterDays?: number;
  };
  bulkEntry: {
    enableCSVImport: boolean;
    enableExcelImport: boolean;
    templateFormat: 'simple' | 'detailed';
  };
}

export interface TenantSettings {
  // Assessment & Grading
  assessment: AssessmentConfig;
  grading: GradingConfig;

  // Report Cards
  reportCard: ReportCardConfig;

  // Academic Calendar
  academicCalendar: AcademicCalendarConfig;

  // Subjects
  subjects: SubjectConfig;

  // Class Levels
  classLevels: ClassLevelConfig;

  // Score Entry
  scoreEntry: ScoreEntryConfig;

  // Notifications
  notifications?: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    notifyOnScorePublish: boolean;
    notifyOnResultPublish: boolean;
    reminderSettings: {
      scoreDueDays: number;
      resultDueDays: number;
    };
  };

  // Access Control
  accessControl?: {
    parentsCanViewScores: boolean;
    parentsCanViewAttendance: boolean;
    teachersCanViewAllClasses: boolean;
    allowScoreComparison: boolean;
  };

  // Data Retention
  dataRetention?: {
    keepStudentDataYears: number;
    keepScoreDataYears: number;
    archiveOldRecords: boolean;
  };
}

// ============================================
// MAIN ENTITIES
// ============================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  primaryColor: string;
  plan: 'free' | 'basic' | 'premium';
  status: 'active' | 'trial' | 'suspended';
  maxStudents: number;
  maxTeachers: number;
  trialEndsAt?: Timestamp;
  subscriptionEndsAt?: Timestamp;
  settings: TenantSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent';
  phone?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id: string;
  tenantId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: 'male' | 'female';
  dateOfBirth: Timestamp;
  currentClassId: string;
  guardianIds: string[];
  photoUrl?: string;
  address?: string;
  medicalInfo?: Record<string, any>;
  admissionDate: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Class {
  id: string;
  tenantId: string;
  name: string; // e.g., "JSS 1A"
  level: string; // e.g., "JSS1", "SS2"
  teacherId?: string; // Class teacher
  studentCount: number;
  academicYear: string; // e.g., "2024/2025"
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  tenantId: string;
  name: string; // e.g., "Mathematics"
  code: string; // e.g., "MATH"
  maxScore: number; // e.g., 100
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Term {
  id: string;
  tenantId: string;
  name: string; // e.g., "First Term 2024/2025"
  startDate: Timestamp;
  endDate: Timestamp;
  isCurrent: boolean;
  academicYear: string; // e.g., "2024/2025"
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Score {
  id: string;
  tenantId: string;
  studentId: string;
  subjectId: string;
  classId: string;
  termId: string;
  teacherId: string;

  // FLEXIBLE ASSESSMENT SCORES
  // Store as key-value pairs based on tenant config
  assessmentScores: {
    [key: string]: number | null; // e.g., { "ca1": 8, "ca2": 9, "exam": 65, "project": 15 }
  };

  // Individual score components (for backward compatibility & queries)
  // These are auto-populated from assessmentScores for easier querying
  ca1?: number;
  ca2?: number;
  ca3?: number;
  ca4?: number;
  ca5?: number; // Support up to 5 CAs by default
  exam?: number;
  project?: number;

  // Custom assessments (if school has additional assessment types)
  customScores?: {
    [assessmentId: string]: number | null;
  };

  // Calculated fields
  totalCa: number; // Sum/weighted average of CA scores
  total: number; // Grand total based on calculation method
  percentage: number; // (total / maxScore) * 100
  grade: string; // Based on grading config (e.g., "A", "B1", "7")
  gpa?: number; // If using GPA system

  // Status flags
  isAbsent: boolean; // Student was absent for this subject
  isExempted: boolean; // Subject exempted for this student

  // Comments & Remarks
  teacherComment?: string;
  remarkCode?: string; // e.g., "EXC", "VG", "FAIR" (for standardized remarks)

  // Workflow status
  isDraft: boolean; // Not yet submitted
  isSubmitted: boolean; // Submitted but not published
  isPublished: boolean; // Published to students/parents
  isLocked: boolean; // Locked from editing

  // Audit trail
  submittedAt?: Timestamp;
  publishedAt?: Timestamp;
  lockedAt?: Timestamp;
  approvedBy?: string; // Admin who approved (if approval required)
  approvedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Result {
  id: string;
  tenantId: string;
  studentId: string;
  termId: string;
  classId: string;
  totalScore: number;
  averageScore: number;
  position: number; // Rank in class
  classSize: number;
  grade: string; // Overall grade
  teacherComment?: string;
  principalComment?: string;
  pdfUrl?: string;
  generatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Guardian {
  id: string;
  tenantId: string;
  userId?: string; // Link to User if they have login
  firstName: string;
  lastName: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  studentIds: string[]; // Children
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// AUDIT LOG INTERFACES (Phase 13)
// ============================================

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'soft_delete' | 'restore'
  | 'login' | 'logout' | 'failed_login'
  | 'publish_scores' | 'unpublish_scores' | 'save_draft'
  | 'generate_result' | 'download_pdf' | 'download_csv'
  | 'export_csv' | 'import_csv'
  | 'change_role' | 'activate_user' | 'deactivate_user'
  | 'view' | 'search' | 'filter';

export type AuditEntityType =
  | 'student' | 'score' | 'result' | 'class' | 'subject' | 'term' | 'teacher'
  | 'user' | 'guardian' | 'tenant' | 'settings' | 'attendance';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'teacher' | 'parent';
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string; // Friendly name for display
  changes?: {
    before?: any;
    after?: any;
    fields?: string[]; // List of changed fields
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>; // Additional context
  success: boolean; // Whether action succeeded
  errorMessage?: string; // If action failed
  timestamp: Timestamp;
  createdAt: Timestamp;
}
