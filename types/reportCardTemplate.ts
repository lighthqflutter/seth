import { Timestamp } from 'firebase/firestore';

// ============================================
// REPORT CARD TEMPLATE TYPES
// ============================================

/**
 * Type of report card template
 */
export type TemplateType = 'classic' | 'modern' | 'compact' | 'comprehensive' | 'custom';

/**
 * Layout mode for the template
 */
export type LayoutMode = 'preset' | 'custom';

/**
 * Page size options
 */
export type PageSize = 'A4' | 'Letter';

/**
 * Page orientation
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Available section types in a report card
 */
export type SectionType =
  | 'header'
  | 'student-info'
  | 'scores-table'
  | 'attendance'
  | 'skills'
  | 'comments'
  | 'footer'
  | 'performance-chart';

/**
 * Logo position options
 */
export type LogoPosition = 'left' | 'center' | 'right';

/**
 * Header style options
 */
export type HeaderStyle = 'classic' | 'modern' | 'minimal';

/**
 * Color scheme options
 */
export type ColorScheme = 'primary' | 'grayscale' | 'custom';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Skills display style options
 */
export type SkillsDisplayStyle = 'table' | 'grid' | 'list';

/**
 * Remark type options
 */
export type RemarkType = 'auto' | 'teacher' | 'both';

/**
 * Page margins configuration
 */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Section position for custom layouts
 */
export interface SectionPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

/**
 * Generic section configuration
 */
export interface SectionConfig {
  [key: string]: any;
}

/**
 * Template section definition
 */
export interface TemplateSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  position?: SectionPosition; // Only for custom layouts
  config?: SectionConfig;
}

/**
 * Layout configuration for the template
 */
export interface LayoutConfig {
  mode: LayoutMode;
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: PageMargins;
  sections: TemplateSection[];
}

/**
 * Custom colors for branding
 */
export interface CustomColors {
  header: string;
  borders: string;
  grades: string;
}

/**
 * Font configuration
 */
export interface FontConfig {
  header: string;
  body: string;
  size: FontSize;
}

/**
 * Branding configuration
 */
export interface BrandingConfig {
  logoPosition: LogoPosition;
  showLogo: boolean;
  showSchoolName: boolean;
  showMotto: boolean;
  showAddress: boolean;
  headerStyle: HeaderStyle;
  colorScheme: ColorScheme;
  customColors?: CustomColors;
  fonts?: FontConfig;
}

/**
 * Scores table configuration
 */
export interface ScoresTableConfig {
  columns: string[]; // e.g., ['CA1', 'CA2', 'CA3', 'Exam', 'Total', 'Grade', 'Percentage', 'Remark']
  showCABreakdown: boolean;
  showPercentage: boolean;
  showGrade: boolean;
  showRemark: boolean;
  showPosition: boolean;
  remarkType: RemarkType;
}

/**
 * Comments section configuration
 */
export interface CommentsConfig {
  showTeacherComment: boolean;
  showPrincipalComment: boolean;
  maxLength: number;
  showSignature: boolean;
}

/**
 * Attendance section configuration
 */
export interface AttendanceConfig {
  enabled: boolean;
  showDaysPresent: boolean;
  showDaysAbsent: boolean;
  showAttendanceRate: boolean;
}

/**
 * Skills section configuration
 */
export interface SkillsConfig {
  enabled: boolean;
  displayStyle: SkillsDisplayStyle;
  showDescriptions: boolean;
}

/**
 * Main Report Card Template interface
 */
export interface ReportCardTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  isDefault: boolean;
  isActive: boolean;
  assignedToClasses: string[]; // Array of class IDs
  assignedToLevels: string[]; // Array of level codes (e.g., ['JSS1', 'JSS2'])

  // Layout configuration
  layout: LayoutConfig;

  // Branding configuration
  branding: BrandingConfig;

  // Scores table configuration
  scoresTable: ScoresTableConfig;

  // Comments configuration
  comments: CommentsConfig;

  // Attendance configuration
  attendance: AttendanceConfig;

  // Skills configuration
  skills: SkillsConfig;

  // Metadata
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Template assignment types
 */
export type AssignmentType = 'all-classes' | 'specific-classes' | 'class-levels';

/**
 * Template assignment configuration
 */
export interface TemplateAssignment {
  templateId: string;
  assignmentType: AssignmentType;
  classIds?: string[]; // For specific-classes
  levels?: string[]; // For class-levels
}

/**
 * Student report data for PDF generation
 */
export interface StudentReportData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    admissionNumber: string;
    class: string;
    classId: string;
    photoUrl?: string;
  };
  term: {
    id: string;
    name: string;
    academicYear: string;
    startDate: Date;
    endDate: Date;
  };
  scores: Array<{
    subjectId: string;
    subject: string;
    assessmentScores: { [key: string]: number | null }; // e.g., { ca1: 8, ca2: 9, exam: 65 }
    totalCa: number;
    total: number;
    percentage: number;
    grade: string;
    remark?: string;
    position?: number;
  }>;
  totalScore: number;
  averageScore: number;
  position: number;
  classSize: number;
  grade: string;
  attendance?: {
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    daysExcused: number;
    totalDays: number;
    attendanceRate: number;
  };
  skills?: Array<{
    name: string;
    rating: number;
    maxRating: number;
    description?: string;
  }>;
  teacherComment?: string;
  principalComment?: string;
  schoolInfo: {
    name: string;
    address?: string;
    logoUrl?: string;
    motto?: string;
    phone?: string;
    email?: string;
    primaryColor: string;
  };
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Template creation/update input (without auto-generated fields)
 */
export type CreateTemplateInput = Omit<
  ReportCardTemplate,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Template update input (partial updates allowed)
 */
export type UpdateTemplateInput = Partial<
  Omit<ReportCardTemplate, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>
>;

/**
 * Template filter options for querying
 */
export interface TemplateFilterOptions {
  tenantId: string;
  isActive?: boolean;
  isDefault?: boolean;
  templateType?: TemplateType;
  classId?: string; // Find templates assigned to this class
  level?: string; // Find templates assigned to this level
}

/**
 * Template with metadata for UI display
 */
export interface TemplateWithMetadata extends ReportCardTemplate {
  assignedClassCount: number;
  assignedLevelCount: number;
  lastUsed?: Timestamp;
}
