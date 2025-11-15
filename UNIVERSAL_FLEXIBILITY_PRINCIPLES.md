# Universal Flexibility & Guided Tour System - Design Document

## Core Principles

### 1. **Universal Flexibility**
Every CRUD element in the system must be completely flexible and configurable by school admins.

### 2. **Dynamic CSV Templates**
CSV templates must be generated dynamically based on the **exact current structure** of data, not hardcoded templates.

### 3. **Guided Tours**
Every admin screen must have an interactive guided tour explaining functionality in easy-to-follow steps.

### 4. **BMad Method + TDD**
All features built using BMad (Build, Measure, Adapt, Deploy) methodology with Test-Driven Development.

---

## Part 1: Universal Flexibility for All CRUD Elements

### Current State (After Configuration System):
✅ **Assessments** - Fully flexible (2-10 CAs, custom names, weights)
✅ **Grading Systems** - Fully flexible (A-F, 1-7, A1-F9, custom)

### To Be Made Flexible:

#### 1. **Classes (Year Levels & Arms)**
**Current Limitation**: Hardcoded class levels (JSS1, SS2, etc.)

**New Approach**: School defines their own structure
```typescript
interface ClassStructureConfig {
  yearLevels: Array<{
    id: string;
    name: string; // "Year 5", "JSS 1", "Grade 1", "Form 1"
    order: number;
    category: string; // "Primary", "Junior", "Senior"
    arms: string[]; // ["A", "B", "C"] or ["Red", "Blue", "Green"]
  }>;

  // Naming conventions
  armNamingPattern: 'letters' | 'colors' | 'names' | 'numbers';
  // letters: A, B, C
  // colors: Red, Blue, Green
  // names: Newton, Einstein, Curie
  // numbers: 1, 2, 3

  // Auto-generate class names
  classNameFormat: string; // e.g., "{year} {arm}" → "Year 5 A"
}
```

**Example Scenarios:**
- **Nigerian School**: JSS1 A, JSS1 B, SS2 C
- **British School**: Year 5 Red, Year 5 Blue, Year 6 Green
- **American School**: Grade 5-1, Grade 5-2, Grade 6-1
- **Custom School**: Form 1 Newton, Form 1 Einstein

**CSV Import**: Generate template based on school's **current class structure**

---

#### 2. **Subjects**
**Current Limitation**: Fixed fields (name, code, maxScore, description)

**New Approach**: Admin defines custom fields for subjects
```typescript
interface SubjectFieldConfig {
  standardFields: {
    name: boolean;
    code: boolean;
    maxScore: boolean;
    description: boolean;
  };

  customFields: Array<{
    id: string;
    name: string; // "Department", "Category", "Credit Hours"
    type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
    options?: string[]; // For select/multiselect
    required: boolean;
    showInList: boolean; // Show in list view
    showInReports: boolean; // Show in reports
  }>;
}
```

**Example Custom Fields:**
- Department (Science, Arts, Social Sciences)
- Category (Core, Elective, Extra-Curricular)
- Credit Hours (1, 2, 3)
- Lab Required (Yes/No)
- Practical Score (if has lab component)

**CSV Import**: Include custom fields in template

---

#### 3. **Students**
**Current Limitation**: Fixed fields (firstName, lastName, etc.)

**New Approach**: Admin defines what student data to collect
```typescript
interface StudentFieldConfig {
  standardFields: {
    firstName: boolean;
    lastName: boolean;
    middleName: boolean;
    admissionNumber: boolean;
    dateOfBirth: boolean;
    gender: boolean;
    // ... etc
  };

  customFields: Array<{
    id: string;
    name: string; // "House", "Religion", "Blood Group", "Previous School"
    type: 'text' | 'number' | 'select' | 'date' | 'file';
    options?: string[];
    required: boolean;
    showInProfile: boolean;
    showInReports: boolean;
    category: 'personal' | 'academic' | 'medical' | 'other';
  }>;
}
```

**Example Custom Fields:**
- House (Red House, Blue House, Green House)
- Religion (Christianity, Islam, Other)
- Blood Group (A+, B+, O+, AB+, etc.)
- Previous School
- Allergies
- Special Needs
- Parent Occupation

**CSV Import**: Include ALL configured fields (standard + custom)

---

#### 4. **Teachers**
**Current State**: Fixed fields (name, email, phone)

**New Approach**: Admin defines teacher data structure
```typescript
interface TeacherFieldConfig {
  standardFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    dateOfBirth: boolean;
    qualification: boolean;
    specialization: boolean;
  };

  customFields: Array<{
    id: string;
    name: string; // "Employee ID", "Department", "Years of Experience"
    type: 'text' | 'number' | 'select' | 'date';
    required: boolean;
  }>;
}
```

**CSV Import**: Match school's configured fields

---

#### 5. **Terms**
**Current State**: Fixed fields (name, startDate, endDate, isCurrent, academicYear)

**New Approach**: Admin defines term structure
```typescript
interface TermFieldConfig {
  standardFields: {
    name: boolean;
    startDate: boolean;
    endDate: boolean;
    isCurrent: boolean;
    academicYear: boolean;
  };

  customFields: Array<{
    id: string;
    name: string; // "Number of Weeks", "Holidays", "School Days"
    type: 'text' | 'number' | 'date';
  }>;

  // Auto-calculate fields
  autoCalculate: {
    numberOfWeeks: boolean;
    numberOfSchoolDays: boolean;
  };
}
```

---

#### 6. **Guardians/Parents**
**New Approach**: Flexible guardian data
```typescript
interface GuardianFieldConfig {
  standardFields: {
    firstName: boolean;
    lastName: boolean;
    relationship: boolean;
    phone: boolean;
    email: boolean;
    address: boolean;
    occupation: boolean;
  };

  customFields: Array<{
    id: string;
    name: string; // "Workplace", "Alternate Phone", "Emergency Contact"
    type: string;
  }>;

  relationshipTypes: string[]; // ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"]
}
```

---

## Part 2: Dynamic CSV Template Generation

### Core Principle:
**CSV templates MUST be generated based on the exact current structure of the entity**

### Implementation Strategy:

#### Step 1: Scan Current Data Structure
```typescript
interface DynamicCSVGenerator {
  /**
   * Scan entity to determine current fields
   */
  scanEntity(entityType: 'classes' | 'subjects' | 'students' | 'teachers' | 'terms'): {
    standardFields: string[];
    customFields: CustomField[];
    requiredFields: string[];
    optionalFields: string[];
  };

  /**
   * Generate CSV template with current fields
   */
  generateTemplate(entityType: string): string;

  /**
   * Generate sample data matching structure
   */
  generateSampleData(entityType: string, rows: number): any[];
}
```

#### Step 2: Dynamic Template Generation Algorithm
```typescript
function generateDynamicCSVTemplate(
  tenantId: string,
  entityType: 'classes' | 'subjects' | 'students' | 'teachers' | 'terms'
): string {
  // 1. Get tenant configuration
  const config = await getTenantConfig(tenantId);

  // 2. Get entity field configuration
  const fieldConfig = config.entityFields[entityType];

  // 3. Build headers array
  const headers: string[] = [];

  // Add standard fields (if enabled)
  if (fieldConfig.standardFields.name) headers.push('name');
  if (fieldConfig.standardFields.code) headers.push('code');
  // ... etc

  // Add custom fields
  fieldConfig.customFields.forEach(field => {
    if (field.required || field.showInList) {
      headers.push(field.id);
    }
  });

  // 4. Generate sample rows
  const sampleRows = generateSampleRows(headers, entityType, 3);

  // 5. Build CSV
  const csv = [
    headers.join(','),
    ...sampleRows.map(row => row.join(','))
  ].join('\n');

  return csv;
}
```

#### Step 3: Context-Aware Templates

**Example: Classes CSV for "Year 5 with arms A, B, C"**

If school has configured:
- Year levels: Year 5, Year 6, Year 7
- Arms: A, B, C
- Custom field: "Class Teacher Email"

**Generated CSV Template:**
```csv
year,arm,classTeacherEmail
Year 5,A,teacher.a@school.com
Year 5,B,teacher.b@school.com
Year 5,C,teacher.c@school.com
```

**NOT a hardcoded template like:**
```csv
name,level,academicYear,teacherId
JSS 1A,JSS1,2024/2025,teacher-id-1
```

---

## Part 3: Guided Tour System

### User Experience:
Every admin screen should have a **"Take Tour"** button that launches an interactive guide.

### Implementation: Using React Joyride or Intro.js

```typescript
interface GuidedTour {
  id: string;
  screen: string; // "classes-list", "subjects-add", "score-entry"
  steps: Array<{
    target: string; // CSS selector or ref
    title: string;
    content: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
    disableBeacon?: boolean;
  }>;

  // Track completion
  onComplete: () => void;
  onSkip: () => void;
}
```

### Example Tours:

#### Tour 1: Classes List Page
```typescript
const classesListTour: GuidedTour = {
  id: 'classes-list',
  screen: 'classes-list',
  steps: [
    {
      target: 'body',
      title: 'Welcome to Classes Management',
      content: 'Here you can manage all your school classes. Let me show you around!',
      placement: 'center',
    },
    {
      target: '[data-tour="add-class-button"]',
      title: 'Add New Class',
      content: 'Click here to add a new class. You can add as many classes as your school needs.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="csv-import"]',
      title: 'Bulk Import',
      content: 'Import multiple classes at once using CSV. Download the template to see the exact format needed.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="download-template"]',
      title: 'Download Template',
      content: 'This template is customized based on YOUR school structure. It will match exactly what fields you have configured.',
      placement: 'left',
    },
    {
      target: '[data-tour="class-card"]',
      title: 'Class Information',
      content: 'Each class shows the number of students, class teacher, and academic year. Click to view details or edit.',
      placement: 'top',
    },
    {
      target: '[data-tour="edit-button"]',
      title: 'Edit Class',
      content: 'Modify class details, change teacher assignments, or update information.',
      placement: 'left',
    },
    {
      target: '[data-tour="delete-button"]',
      title: 'Delete Class',
      content: 'Remove a class. Note: You cannot delete a class that has students enrolled.',
      placement: 'left',
    },
  ],
};
```

#### Tour 2: Score Entry Page
```typescript
const scoreEntryTour: GuidedTour = {
  id: 'score-entry',
  screen: 'score-entry',
  steps: [
    {
      target: 'body',
      title: 'Score Entry Made Easy',
      content: 'Enter student scores quickly and efficiently. This interface adapts to your school\'s assessment structure.',
      placement: 'center',
    },
    {
      target: '[data-tour="class-selector"]',
      title: 'Select Class',
      content: 'Choose which class you want to enter scores for.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="subject-selector"]',
      title: 'Select Subject',
      content: 'Choose the subject. The system will load all students in the selected class.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="assessment-columns"]',
      title: 'Assessment Columns',
      content: 'These columns match YOUR school\'s assessment structure. The number and names are based on your configuration.',
      placement: 'top',
    },
    {
      target: '[data-tour="save-draft"]',
      title: 'Save as Draft',
      content: 'Save your work without publishing. You can come back and continue later.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="publish"]',
      title: 'Publish Scores',
      content: 'Once published, students and parents can view the scores. Make sure all entries are correct!',
      placement: 'bottom',
    },
  ],
};
```

#### Tour 3: Configuration Settings Page
```typescript
const configSettingsTour: GuidedTour = {
  id: 'config-settings',
  screen: 'settings-assessment',
  steps: [
    {
      target: 'body',
      title: 'Customize Your School System',
      content: 'This is where you configure how assessments work in your school. Every school is unique!',
      placement: 'center',
    },
    {
      target: '[data-tour="preset-selector"]',
      title: 'Quick Setup with Presets',
      content: 'Choose from 5 pre-configured setups for common education systems, or customize everything yourself.',
      placement: 'right',
    },
    {
      target: '[data-tour="ca-number"]',
      title: 'Number of Continuous Assessments',
      content: 'Set how many CAs your school has per term. You can have 2, 3, 4, 5, or more!',
      placement: 'right',
    },
    {
      target: '[data-tour="ca-config"]',
      title: 'Configure Each Assessment',
      content: 'For each CA, set the name (CA1, Quiz, Test) and maximum score. You have complete control!',
      placement: 'left',
    },
    {
      target: '[data-tour="calculation-method"]',
      title: 'Calculation Method',
      content: 'Choose how final scores are calculated: Simple Sum, Weighted Average, or Best of N.',
      placement: 'right',
    },
    {
      target: '[data-tour="grading-system"]',
      title: 'Grading System',
      content: 'Define your grade boundaries (A-F, 1-7, A1-F9) and pass marks.',
      placement: 'right',
    },
    {
      target: '[data-tour="preview"]',
      title: 'Preview Changes',
      content: 'See how your configuration will look in action before saving.',
      placement: 'bottom',
    },
  ],
};
```

### Tour Management System

```typescript
interface TourState {
  userId: string;
  completedTours: string[]; // Tour IDs
  skippedTours: string[];
  lastTourDate: Date;
  tourPreferences: {
    autoStart: boolean; // Auto-start tours on first visit
    showTourButton: boolean; // Always show "Take Tour" button
  };
}

class TourManager {
  /**
   * Check if user has completed tour for this screen
   */
  hasCompletedTour(userId: string, tourId: string): boolean;

  /**
   * Mark tour as completed
   */
  completeTour(userId: string, tourId: string): void;

  /**
   * Should auto-start tour on first visit?
   */
  shouldAutoStart(userId: string, tourId: string): boolean;

  /**
   * Get tour for current screen
   */
  getTourForScreen(screenName: string): GuidedTour | null;
}
```

---

## Part 4: Implementation Roadmap

### Phase Order (Following BMad + TDD):

#### **Immediate (Phase 8C): Core Configuration UI**
**Priority**: HIGH
**Why First**: Schools need to configure before using other features
**Duration**: 2-3 hours

**Build:**
1. Settings page for assessment configuration
2. Settings page for grading configuration
3. Preset selector
4. Configuration preview

**Test:**
- Configuration save/load
- Preset application
- Validation

**Measure:**
- Configuration completion rate
- Time to configure
- Preset vs custom usage

---

#### **Phase 9: Students Management (Core Feature)**
**Priority**: CRITICAL
**Duration**: 4-5 hours

**Build:**
1. Student list page (already done)
2. Student Add form with custom fields support
3. Student Edit form
4. Student Delete (soft delete)
5. Dynamic CSV template generation for students
6. CSV import with validation
7. Guided tour for student management

**Test:**
- All CRUD operations
- Custom field handling
- CSV import with custom fields
- Tour functionality

**Measure:**
- Students added per school
- CSV import usage
- Tour completion rate

---

#### **Phase 10: Dynamic CSV System (Universal)**
**Priority**: HIGH (Enables bulk operations)
**Duration**: 3-4 hours

**Build:**
1. Dynamic template generator for all entities
2. Context-aware CSV validation
3. Sample data generator
4. Error reporting for custom fields

**Test:**
- Template generation for each entity
- Validation with custom fields
- Error handling

**Measure:**
- CSV download rate
- Import success rate
- Error frequency

---

#### **Phase 11: Guided Tour System (UX Enhancement)**
**Priority**: MEDIUM (Can be added incrementally)
**Duration**: 2-3 hours initial setup + 30 mins per screen

**Build:**
1. Install React Joyride or Intro.js
2. Create TourManager component
3. Add tours for key screens:
   - Classes list
   - Subjects list
   - Students list
   - Score entry
   - Configuration settings
4. Tour state persistence
5. "Take Tour" button component

**Test:**
- Tour navigation
- Step targeting
- Completion tracking
- Skip functionality

**Measure:**
- Tour start rate
- Tour completion rate
- Time to complete
- Skip rate

---

#### **Phase 12: Score Entry (Dynamic)**
**Priority**: CRITICAL
**Duration**: 4-5 hours

**Build:**
1. Dynamic score entry form based on config
2. Generate input fields from assessment config
3. Validation against configured max scores
4. Auto-calculation using configured method
5. Grade assignment using configured boundaries
6. CSV import for bulk score entry
7. Guided tour for score entry

**Test:**
- Form generation for different configs
- Calculation accuracy
- Grade assignment
- CSV import
- Tour

---

#### **Phase 13: Results & Reports (Dynamic)**
**Priority**: CRITICAL
**Duration**: 6-8 hours

**Build:**
1. Result generation based on config
2. Dynamic report card templates
3. PDF generation with school branding
4. Show/hide sections based on config
5. Display configured grading system
6. Guided tour for reports

**Test:**
- Report generation for different configs
- PDF formatting
- Branding application
- Tour

---

#### **Phase 14: Universal Custom Fields (Enhancement)**
**Priority**: MEDIUM (Can be gradual)
**Duration**: 4-6 hours

**Build:**
1. Custom field management UI
2. Field type support (text, number, select, date, file)
3. Field validation
4. Show custom fields in all forms
5. Include custom fields in CSV templates
6. Store custom fields in Firestore

**Test:**
- Custom field CRUD
- Form integration
- CSV integration
- Data persistence

---

#### **Phase 15: Advanced Features**
**Priority**: LOW
**Duration**: Variable

**Build:**
1. Class structure customization UI
2. Subject category management
3. Guardian field customization
4. Teacher field customization
5. Term field customization

---

## Part 5: Technical Implementation Details

### 1. Custom Fields Storage

```typescript
// Firestore document structure
interface EntityWithCustomFields {
  // Standard fields
  id: string;
  tenantId: string;
  name: string;
  // ... other standard fields

  // Custom fields
  customData: {
    [fieldId: string]: any; // Stores custom field values
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Example: Student with custom fields
{
  id: "student-123",
  tenantId: "school-456",
  firstName: "John",
  lastName: "Doe",
  customData: {
    "house": "Red House",
    "religion": "Christianity",
    "bloodGroup": "O+",
    "previousSchool": "ABC School"
  }
}
```

### 2. Dynamic Form Generation

```typescript
interface DynamicForm {
  /**
   * Generate form fields based on configuration
   */
  generateFields(
    entityType: string,
    config: FieldConfig
  ): FormField[];

  /**
   * Render form with custom fields
   */
  renderForm(fields: FormField[]): JSX.Element;

  /**
   * Validate form including custom fields
   */
  validateForm(data: any, config: FieldConfig): ValidationResult;
}
```

### 3. Dynamic CSV Import

```typescript
class DynamicCSVImporter {
  /**
   * Parse CSV with custom fields
   */
  parseCSV(
    csvContent: string,
    entityType: string,
    config: FieldConfig
  ): ParseResult;

  /**
   * Validate each row against config
   */
  validateRow(
    row: any,
    config: FieldConfig,
    rowNumber: number
  ): ValidationResult;

  /**
   * Import data with custom fields
   */
  async importData(
    data: any[],
    entityType: string,
    tenantId: string
  ): Promise<ImportResult>;
}
```

---

## Part 6: Testing Strategy (TDD)

### Test Categories:

#### 1. Configuration Tests
```typescript
describe('Assessment Configuration', () => {
  it('should allow 2-10 CAs');
  it('should validate CA max scores');
  it('should apply calculation method correctly');
  it('should generate correct grade boundaries');
});

describe('Custom Fields Configuration', () => {
  it('should add custom field to entity');
  it('should validate custom field types');
  it('should enforce required custom fields');
});
```

#### 2. Dynamic CSV Tests
```typescript
describe('Dynamic CSV Template Generation', () => {
  it('should generate template with standard fields');
  it('should include custom fields in template');
  it('should include only enabled fields');
  it('should generate sample data matching structure');
});

describe('Dynamic CSV Import', () => {
  it('should parse CSV with custom fields');
  it('should validate custom field values');
  it('should report errors for invalid custom fields');
});
```

#### 3. Guided Tour Tests
```typescript
describe('Guided Tour System', () => {
  it('should render tour for screen');
  it('should track tour completion');
  it('should allow tour skip');
  it('should auto-start on first visit');
  it('should show "Take Tour" button');
});
```

---

## Part 7: BMad Methodology Application

### Build
- TDD: Write tests first
- Implement features incrementally
- Start with core, add enhancements

### Measure
Track metrics:
- Configuration completion rate
- Custom field usage
- CSV template downloads
- CSV import success rate
- Tour completion rate
- Time to complete tours
- Feature adoption rate

### Adapt
Based on metrics:
- Improve configurations that are confusing
- Enhance CSV templates that have high error rates
- Simplify tours that are frequently skipped
- Add more guided tours for complex features

### Deploy
- Incremental rollout
- Monitor usage
- Collect feedback
- Iterate

---

## Summary

### Core Principles:
1. ✅ **Universal Flexibility** - All CRUD elements configurable
2. ✅ **Dynamic CSV Templates** - Generated from exact current structure
3. ✅ **Guided Tours** - Every screen has interactive help
4. ✅ **BMad + TDD** - Tested, measured, iterable

### Implementation Order:
1. Phase 8C: Core Configuration UI
2. Phase 9: Students Management (with custom fields)
3. Phase 10: Dynamic CSV System
4. Phase 11: Guided Tour System
5. Phase 12: Score Entry (dynamic)
6. Phase 13: Results & Reports (dynamic)
7. Phase 14: Universal Custom Fields
8. Phase 15: Advanced Customizations

### Next Immediate Step:
**Phase 9: Students Management** with:
- Custom field support
- Dynamic CSV templates
- Guided tour
- Full TDD coverage

---

**Ready to proceed with Phase 9!** 🚀
