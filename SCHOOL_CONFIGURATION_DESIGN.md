# School Configuration System Design

## Overview

This document outlines a comprehensive, fully customizable configuration system that allows each school (tenant) to customize all aspects of their academic operations, grading systems, and assessment structures.

## Core Principle

**Every school is unique** - The system must be flexible enough to accommodate different:
- Grading systems (A-F, 1-7, percentage-based, custom)
- Assessment structures (2-10 CAs, weighted/unweighted)
- Score entry methods (percentage, points, letter grades)
- Report card formats
- Academic calendars
- Performance metrics

---

## 1. Assessment Configuration

### Continuous Assessments (CAs)

```typescript
interface AssessmentConfig {
  // Number of CAs per term (flexible: 0-10)
  numberOfCAs: number; // e.g., 2, 3, 4, 5

  // Each CA configuration
  caConfigs: Array<{
    name: string; // e.g., "CA1", "Test 1", "Quiz 1"
    maxScore: number; // e.g., 10, 15, 20
    weight?: number; // Optional weight percentage (if using weighted average)
    isOptional: boolean; // Some schools make certain CAs optional
  }>;

  // Exam configuration
  exam: {
    enabled: boolean;
    name: string; // e.g., "End of Term Exam", "Final Exam"
    maxScore: number; // e.g., 60, 70, 100
    weight?: number;
  };

  // Project/Assignment configuration
  project: {
    enabled: boolean;
    name: string; // e.g., "Project", "Assignment", "Practical"
    maxScore: number;
    weight?: number;
    isOptional: boolean;
  };

  // Additional assessment types (for flexibility)
  customAssessments?: Array<{
    id: string;
    name: string; // e.g., "Attendance", "Conduct", "Presentation"
    maxScore: number;
    weight?: number;
    isOptional: boolean;
  }>;

  // Calculation method
  calculationMethod: 'sum' | 'weighted_average' | 'best_of_n' | 'custom';

  // For 'best_of_n': take best N scores out of M assessments
  bestOfN?: {
    take: number; // Take best N
    from: number; // From M assessments
  };

  // Total possible score
  totalMaxScore: number; // Auto-calculated or manual
}
```

**Examples:**

**School A (Traditional Nigerian):**
```json
{
  "numberOfCAs": 3,
  "caConfigs": [
    { "name": "CA1", "maxScore": 10, "isOptional": false },
    { "name": "CA2", "maxScore": 10, "isOptional": false },
    { "name": "CA3", "maxScore": 10, "isOptional": false }
  ],
  "exam": { "enabled": true, "name": "Exam", "maxScore": 70 },
  "project": { "enabled": false },
  "calculationMethod": "sum",
  "totalMaxScore": 100
}
```

**School B (Project-Based):**
```json
{
  "numberOfCAs": 2,
  "caConfigs": [
    { "name": "Quiz 1", "maxScore": 15, "isOptional": false },
    { "name": "Quiz 2", "maxScore": 15, "isOptional": false }
  ],
  "exam": { "enabled": true, "name": "Final Exam", "maxScore": 50 },
  "project": { "enabled": true, "name": "Term Project", "maxScore": 20, "isOptional": false },
  "calculationMethod": "sum",
  "totalMaxScore": 100
}
```

**School C (Weighted System):**
```json
{
  "numberOfCAs": 4,
  "caConfigs": [
    { "name": "Test 1", "maxScore": 100, "weight": 10, "isOptional": false },
    { "name": "Test 2", "maxScore": 100, "weight": 10, "isOptional": false },
    { "name": "Test 3", "maxScore": 100, "weight": 10, "isOptional": false },
    { "name": "Mid-term", "maxScore": 100, "weight": 20, "isOptional": false }
  ],
  "exam": { "enabled": true, "name": "Final", "maxScore": 100, "weight": 50 },
  "calculationMethod": "weighted_average",
  "totalMaxScore": 100
}
```

---

## 2. Grading System Configuration

```typescript
interface GradingConfig {
  // Grading system type
  system: 'letter' | 'numeric' | 'percentage' | 'custom';

  // Grade boundaries (for letter/numeric systems)
  gradeBoundaries: Array<{
    grade: string; // e.g., "A", "1", "Excellent"
    minScore: number; // Minimum score (inclusive)
    maxScore: number; // Maximum score (inclusive)
    gpa?: number; // Grade Point Average (optional)
    description?: string; // e.g., "Excellent", "Very Good"
    color?: string; // For UI display
  }>;

  // Pass mark
  passMark: number; // e.g., 40, 50

  // Honors/Distinctions
  distinctionMark?: number; // e.g., 75 for distinction

  // Display preferences
  displayPreference: {
    showPercentage: boolean;
    showGrade: boolean;
    showGPA: boolean;
    showPosition: boolean;
    showRemark: boolean;
  };
}
```

**Examples:**

**Traditional A-F System:**
```json
{
  "system": "letter",
  "gradeBoundaries": [
    { "grade": "A", "minScore": 90, "maxScore": 100, "gpa": 4.0, "description": "Excellent" },
    { "grade": "B", "minScore": 80, "maxScore": 89, "gpa": 3.0, "description": "Very Good" },
    { "grade": "C", "minScore": 70, "maxScore": 79, "gpa": 2.5, "description": "Good" },
    { "grade": "D", "minScore": 60, "maxScore": 69, "gpa": 2.0, "description": "Pass" },
    { "grade": "E", "minScore": 50, "maxScore": 59, "gpa": 1.0, "description": "Pass" },
    { "grade": "F", "minScore": 0, "maxScore": 49, "gpa": 0.0, "description": "Fail" }
  ],
  "passMark": 50
}
```

**Nigerian WAEC-Style:**
```json
{
  "system": "letter",
  "gradeBoundaries": [
    { "grade": "A1", "minScore": 75, "maxScore": 100, "description": "Excellent" },
    { "grade": "B2", "minScore": 70, "maxScore": 74, "description": "Very Good" },
    { "grade": "B3", "minScore": 65, "maxScore": 69, "description": "Good" },
    { "grade": "C4", "minScore": 60, "maxScore": 64, "description": "Credit" },
    { "grade": "C5", "minScore": 55, "maxScore": 59, "description": "Credit" },
    { "grade": "C6", "minScore": 50, "maxScore": 54, "description": "Credit" },
    { "grade": "D7", "minScore": 45, "maxScore": 49, "description": "Pass" },
    { "grade": "E8", "minScore": 40, "maxScore": 44, "description": "Pass" },
    { "grade": "F9", "minScore": 0, "maxScore": 39, "description": "Fail" }
  ],
  "passMark": 40
}
```

**IB-Style (1-7):**
```json
{
  "system": "numeric",
  "gradeBoundaries": [
    { "grade": "7", "minScore": 90, "maxScore": 100, "description": "Excellent" },
    { "grade": "6", "minScore": 80, "maxScore": 89, "description": "Very Good" },
    { "grade": "5", "minScore": 70, "maxScore": 79, "description": "Good" },
    { "grade": "4", "minScore": 60, "maxScore": 69, "description": "Satisfactory" },
    { "grade": "3", "minScore": 50, "maxScore": 59, "description": "Mediocre" },
    { "grade": "2", "minScore": 40, "maxScore": 49, "description": "Poor" },
    { "grade": "1", "minScore": 0, "maxScore": 39, "description": "Very Poor" }
  ],
  "passMark": 60
}
```

---

## 3. Report Card Configuration

```typescript
interface ReportCardConfig {
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
    skillsRating: boolean; // e.g., Leadership, Teamwork
    conductRating: boolean; // e.g., Punctuality, Neatness
    teacherComments: boolean;
    principalComments: boolean;
    classTeacherComments: boolean;
    nextTermInfo: boolean; // Next term begins, fees due
    performanceChart: boolean;
    termHistory: boolean; // Show past terms performance
  };

  // Comments configuration
  comments: {
    maxLength: number;
    required: boolean;
    autoGenerate: boolean; // Generate comments based on performance
  };

  // Skills/Affective domain configuration
  affectiveDomains?: Array<{
    name: string; // e.g., "Punctuality", "Neatness", "Teamwork"
    scale: string; // e.g., "1-5", "A-E", "Excellent-Poor"
    scaleValues: string[]; // e.g., ["5", "4", "3", "2", "1"]
  }>;

  // Additional info to display
  additionalInfo?: {
    schoolCalendar: boolean;
    feeInformation: boolean;
    contactInformation: boolean;
  };
}
```

---

## 4. Academic Calendar Configuration

```typescript
interface AcademicCalendarConfig {
  // Term structure
  termsPerYear: number; // Usually 3 in Nigeria, 2-4 in other countries

  // Current academic year
  currentAcademicYear: string; // e.g., "2024/2025"

  // Term naming convention
  termNamingPattern: 'ordinal' | 'seasonal' | 'custom';
  // ordinal: First Term, Second Term, Third Term
  // seasonal: Fall, Winter, Spring, Summer
  // custom: User defines names

  customTermNames?: string[];

  // Week numbering
  weekNumbering: boolean; // Show week numbers in reports

  // Holiday tracking
  trackHolidays: boolean;
}
```

---

## 5. Subject Configuration

```typescript
interface SubjectConfig {
  // Allow different max scores per subject
  allowCustomMaxScores: boolean;

  // Subject categories
  categories: Array<{
    name: string; // e.g., "Core", "Elective", "Extra-Curricular"
    color: string;
    requiredCount?: number; // Min subjects in this category
  }>;

  // Subject-specific assessment config
  allowSubjectSpecificAssessments: boolean;
  // If true, subjects can override tenant assessment config
}
```

---

## 6. Class/Level Configuration

```typescript
interface ClassLevelConfig {
  // Level naming system
  levels: Array<{
    code: string; // e.g., "JSS1", "SS2", "Grade 1"
    displayName: string; // e.g., "Junior Secondary 1"
    order: number; // For sorting
    category: string; // e.g., "Junior", "Senior", "Primary"
  }>;

  // Promotion criteria
  promotionCriteria: {
    minimumPassSubjects: number;
    minimumAverageScore: number;
    coreSubjectsMustPass: boolean;
    coreSubjects: string[]; // Subject codes
  };
}
```

---

## 7. Score Entry Configuration

```typescript
interface ScoreEntryConfig {
  // Entry method
  entryMethod: 'percentage' | 'points' | 'grade';

  // Validation
  validation: {
    allowDecimal: boolean;
    allowZero: boolean;
    allowAbsent: boolean; // Mark student as absent vs score of 0
    warnOnOutliers: boolean; // Warn if score is unusually high/low
  };

  // Workflow
  workflow: {
    requireApproval: boolean; // Scores need admin approval before publishing
    allowEdit: boolean; // Allow editing after publishing
    allowDelete: boolean; // Allow deleting published scores
    lockAfterDays?: number; // Auto-lock scores after N days
  };

  // Bulk entry options
  bulkEntry: {
    enableCSVImport: boolean;
    enableExcelImport: boolean;
    templateFormat: 'simple' | 'detailed';
  };
}
```

---

## 8. Complete Tenant Settings Interface

Now let's update the Tenant interface with all these configurations:

```typescript
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
    allowScoreComparison: boolean; // Show class average, highest, lowest
  };

  // Data Retention
  dataRetention?: {
    keepStudentDataYears: number;
    keepScoreDataYears: number;
    archiveOldRecords: boolean;
  };
}

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

  // NEW: Comprehensive settings
  settings: TenantSettings;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 9. Updated Score Interface

Now update the Score interface to be fully flexible:

```typescript
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
    [key: string]: number | null; // e.g., { "ca1": 8, "ca2": 9, "exam": 65 }
  };

  // Individual score components (for backward compatibility & queries)
  ca1?: number;
  ca2?: number;
  ca3?: number;
  ca4?: number;
  ca5?: number; // Support up to 5 CAs by default
  exam?: number;
  project?: number;

  // Custom assessments
  customScores?: {
    [assessmentId: string]: number | null;
  };

  // Calculated fields
  totalCa: number; // Sum/weighted average of CA scores
  total: number; // Grand total based on calculation method
  percentage: number; // (total / maxScore) * 100
  grade: string; // Based on grading config
  gpa?: number; // If using GPA system

  // Status
  isAbsent: boolean; // Student was absent for this subject
  isExempted: boolean; // Subject exempted for this student

  // Comments & Remarks
  teacherComment?: string;
  remarkCode?: string; // e.g., "EXC", "VG", "FAIR" (for standardized remarks)

  // Workflow
  isDraft: boolean; // Not yet submitted
  isSubmitted: boolean; // Submitted but not published
  isPublished: boolean;
  isLocked: boolean; // Locked from editing

  // Audit
  submittedAt?: Timestamp;
  publishedAt?: Timestamp;
  lockedAt?: Timestamp;
  approvedBy?: string; // Admin who approved
  approvedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 10. Implementation Strategy

### Phase 1: Core Configuration (Before Phase 9)
1. Update `types/index.ts` with new interfaces
2. Create default configuration presets (Nigerian, British, American systems)
3. Build Settings Management UI for admins
4. Add configuration validation

### Phase 2: Score Entry (Phase 11)
1. Dynamic score entry forms based on config
2. Validation against configured max scores
3. Auto-calculation based on calculation method
4. Support all entry workflows

### Phase 3: Reports (Phase 12)
1. Generate reports based on report card config
2. Dynamic PDF templates
3. Show configured grading system
4. Apply configured branding

---

## 11. Default Configuration Presets

Schools can choose from presets or fully customize:

### Preset 1: Nigerian Secondary School (Standard)
- 3 CAs (10 marks each)
- Exam (70 marks)
- A1-F9 grading system
- Pass mark: 40

### Preset 2: Nigerian Secondary School (Modern)
- 3 CAs (15 marks each)
- Exam (55 marks)
- A-F grading system
- Pass mark: 50

### Preset 3: International School (IB-Style)
- 4 assessments (weighted)
- 1-7 grading scale
- Pass mark: 60

### Preset 4: British Curriculum
- 2 assessments + coursework
- A*-U grading
- Pass mark: 40

### Preset 5: American System
- 4 quarters (weighted)
- A-F with GPA
- Pass mark: 60

---

## 12. Migration Plan

Since we're early in development:
1. ✅ Refactor now (no production data to migrate)
2. ✅ Build configuration UI in Phase 8C
3. ✅ Test with multiple school configurations
4. ✅ Document all configuration options
5. ✅ Provide setup wizard for new schools

---

## Benefits of This Approach

1. **Maximum Flexibility**: Schools can configure everything
2. **Future-Proof**: Easy to add new assessment types
3. **Multi-Country**: Works for any country's education system
4. **Competitive Advantage**: Most school systems are rigid
5. **Scalability**: Same codebase serves all school types
6. **Easy Onboarding**: Presets for quick setup

---

## Next Steps

1. ✅ Update `types/index.ts` with new interfaces
2. ✅ Create configuration presets file
3. ✅ Build Settings Management pages (Phase 8C)
4. ✅ Update all related components to use config
5. ✅ Write comprehensive tests for all configs
6. ✅ Create documentation for school admins

---

**This design ensures EVERY school can customize the system to match their exact needs!**
