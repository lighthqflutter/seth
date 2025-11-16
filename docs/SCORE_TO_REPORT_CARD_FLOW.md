# Score Entry to Report Card Flow

## Complete User Journey: From Entering Scores to Downloading PDF Report Cards

This document outlines the complete flow from entering student scores to generating and downloading customized PDF report cards.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCORE ENTRY TO REPORT CARD FLOW                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: SCORE ENTRY                                                  │
│ URL: /dashboard/scores                                               │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Select Class          │
                    │  Select Subject        │
                    │  Select Term           │ ◄── Auto-selects current term
                    │                        │     Shows warning if non-current
                    └────────────┬───────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: ENTER/EDIT SCORES                                            │
│ URL: /dashboard/scores/entry?classId=X&subjectId=Y&termId=Z         │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─── Loads existing scores (if any)
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Student List          │
                    │  ├─ CA1, CA2, CA3     │
                    │  ├─ Exam Score        │
                    │  └─ Auto-calculated:  │
                    │     • Total           │
                    │     • Percentage      │
                    │     • Grade           │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Click "Publish        │
                    │  Scores" button        │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Saves to Firestore:   │
                    │  • Updates existing OR │
                    │  • Creates new         │
                    │  • Sets isPublished:   │
                    │    true                │
                    └────────────┬───────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: VIEW RESULTS                                                 │
│ URL: /dashboard/results                                              │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Select Term           │
                    │  Select Class          │
                    └────────────┬───────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: CLASS RESULTS VIEW                                           │
│ URL: /dashboard/results/class/[classId]/[termId]                    │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─── Queries all published scores
                                 │    for class + term
                                 │
                                 ├─── Calculates:
                                 │    • Student totals
                                 │    • Class average
                                 │    • Rankings/positions
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Results Table:        │
                    │  ├─ Student rankings   │
                    │  ├─ Total scores       │
                    │  ├─ Averages           │
                    │  ├─ Grades             │
                    │  └─ Actions:           │
                    │     • View Details     │
                    │     • Download All     │
                    └────────────┬───────────┘
                                 │
                                 ▼
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        ▼                                                  ▼
┌──────────────────┐                            ┌──────────────────┐
│ Click "Download  │                            │ Click "View      │
│ All (X)" button  │                            │ Details" for     │
│                  │                            │ individual       │
└────────┬─────────┘                            │ student          │
         │                                      └────────┬─────────┘
         │                                               │
         ▼                                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 5: REPORT CARD GENERATION                                       │
│ File: /lib/pdfGenerator.ts                                           │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─── 1. Load Student Data
                                 │    (name, admission #, class)
                                 │
                                 ├─── 2. Load Class & Term Data
                                 │
                                 ├─── 3. Load All Scores
                                 │    Query: published scores for
                                 │    student + term
                                 │
                                 ├─── 4. Load Subject Names
                                 │
                                 ├─── 5. Calculate Attendance
                                 │    (from attendance collection)
                                 │
                                 ├─── 6. Calculate Results:
                                 │    • Average score
                                 │    • Overall grade
                                 │    • Performance remark
                                 │
                                 ├─── 7. Load School Branding
                                 │    (logo, name, motto, etc.)
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 6: LOAD REPORT CARD TEMPLATE                                    │
│ File: /lib/reportCardTemplates/templateAssignment.ts                │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ├─── Priority System:
                                 │    1. Direct class assignment
                                 │    2. Level assignment
                                 │    3. Default template
                                 │    4. Legacy fallback
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Template Found?       │
                    └────────┬───────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌──────────────┐        ┌──────────────────┐
        │ YES: Use     │        │ NO: Use Legacy   │
        │ Dynamic      │        │ Static Template  │
        │ Template     │        │ (ReportCardPDF)  │
        └──────┬───────┘        └────────┬─────────┘
               │                         │
               ▼                         │
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 7: DYNAMIC PDF RENDERING                                        │
│ File: /components/pdf/DynamicReportCardPDF.tsx                      │
└──────────────────────────────────────────────────────────────────────┘
               │                         │
               ├─────────────────────────┘
               │
               ├─── Apply Template Styling:
               │    • Color scheme (primary/grayscale/custom)
               │    • Font sizes (small/medium/large)
               │    • Margins (top, bottom, left, right)
               │    • Logo position (left/center/right)
               │    • Page size (A4/Letter)
               │    • Orientation (portrait/landscape)
               │
               ├─── Render Enabled Sections (in order):
               │    ├─ Header (school info, logo)
               │    ├─ Student Info (name, class, etc.)
               │    ├─ Scores Table
               │    │  └─ With/without CA breakdown
               │    ├─ Summary (totals, average, grade)
               │    ├─ Attendance (if enabled)
               │    ├─ Comments (teacher + principal)
               │    └─ Footer (date, next term)
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 8: PDF GENERATION & DOWNLOAD                                    │
│ Library: @react-pdf/renderer                                         │
└──────────────────────────────────────────────────────────────────────┘
               │
               ├─── Convert React component to PDF
               │    using pdf().toBlob()
               │
               ├─── Create download URL
               │    URL.createObjectURL(blob)
               │
               ├─── Trigger browser download
               │    <a download="StudentName_Term_Report.pdf">
               │
               ▼
        ┌──────────────────┐
        │  PDF Downloaded  │
        │  to user's       │
        │  computer        │
        └──────────────────┘
```

---

## Detailed Steps

### 1. Score Entry Setup

**Location**: `/dashboard/scores`

**User Actions**:
- Select class (e.g., "Year 1A")
- Select subject (e.g., "Mathematics")
- Select term (auto-selects current term)

**System**:
- Validates selections
- Navigates to entry page with query params
- Shows warning if non-current term selected

---

### 2. Enter/Edit Scores

**Location**: `/dashboard/scores/entry?classId=X&subjectId=Y&termId=Z`

**System Loads**:
1. Students in the class (where `currentClassId` matches)
2. Existing scores for this class/subject/term combination
3. Score configuration (CA breakdown settings)

**User Actions**:
- Enter CA1, CA2, CA3 scores (out of 10 each)
- Enter Exam score (out of 70)
- Mark absent students if needed

**Auto-Calculations**:
- Total = CA1 + CA2 + CA3 + Exam (max 100)
- Percentage = (Total / 100) × 100
- Grade = Based on grading scale:
  - A1: 75-100
  - B2: 70-74
  - C4: 60-69
  - C6: 50-59
  - D7: 45-49
  - E8: 40-44
  - F9: 0-39

**Save Options**:
- "Save as Draft" (isPublished: false)
- "Publish Scores" (isPublished: true)

**Firestore Document** (per student):
```javascript
{
  tenantId: "school_id",
  studentId: "student_id",
  classId: "class_id",
  subjectId: "subject_id",
  termId: "term_id",
  teacherId: "teacher_id",
  assessmentScores: {
    ca1: 9,
    ca2: 8,
    ca3: 9,
    exam: 60
  },
  total: 86,
  percentage: 86,
  grade: "A1",
  isPublished: true,
  isAbsent: false,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### 3. View Results

**Location**: `/dashboard/results`

**User Actions**:
- Select term (defaults to current)
- Click "View Results" on a class card

**System**:
- Shows all classes
- Displays student count per class (real-time)

---

### 4. Class Results View

**Location**: `/dashboard/results/class/[classId]/[termId]`

**System Queries**:
```typescript
// Students in the class
where('currentClassId', '==', classId)
where('isActive', '==', true)

// Published scores for class + term
where('classId', '==', classId)
where('termId', '==', termId)
where('isPublished', '==', true)
```

**Calculations**:
- Per student: Sum all subjects → average
- Class: Average of all students
- Rankings: Sort by average (descending)

**Display**:
- Class statistics (average, highest, lowest)
- Top performers
- Full student list with ranks
- "Download All (X)" button
- Individual "View Details" buttons

---

### 5. Generate Report Card

**Triggered By**:
- Click "Download All" → Bulk generation
- Click individual download → Single generation

**Function**: `generateReportCardPDF()`
**Location**: `/lib/pdfGenerator.ts:35-219`

**Data Collection**:
1. **Student**: Name, admission #, gender, DOB
2. **Class**: Name, level
3. **Term**: Name, academic year, dates
4. **Scores**: All published scores for student + term
5. **Subjects**: Load subject names for all scores
6. **Attendance**: Query attendance records within term dates
   ```typescript
   where('studentId', '==', studentId)
   where('date', '>=', termStartDate)
   where('date', '<=', termEndDate)
   ```
7. **School Branding**: Logo, name, motto, address
8. **Comments**: Teacher and principal comments (optional)

**Calculations**:
```typescript
// Attendance stats
totalDays = attendanceRecords.length
presentDays = records with status 'present' or 'late'
attendanceRate = (presentDays / totalDays) × 100

// Performance summary
averageScore = sum(all subject scores) / number of subjects
overallGrade = grade based on average
subjectsPassed = scores >= passMark
subjectsFailed = scores < passMark
```

---

### 6. Load Template

**Function**: `getTemplateForClass()`
**Location**: `/lib/reportCardTemplates/templateAssignment.ts:70-131`

**Priority Order**:
1. **Direct Assignment**: Template assigned to specific class
2. **Level Assignment**: Template assigned to class level (e.g., "Year 1")
3. **Default Template**: School's default template (isDefault: true)
4. **Legacy Fallback**: Static template if none found

**Query**:
```typescript
// Check direct assignment
where('assignedToClasses', 'array-contains', classId)
where('isActive', '==', true)

// Or level assignment
where('assignedToLevels', 'array-contains', classLevel)
where('isActive', '==', true)

// Or default
where('isDefault', '==', true)
where('isActive', '==', true)
```

**Template Structure**:
```typescript
{
  name: "Modern Professional",
  layout: {
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 20, bottom: 20, left: 15, right: 15 },
    colorScheme: "primary",
    fontSize: "medium",
    sections: [
      { type: "header", enabled: true, order: 1 },
      { type: "studentInfo", enabled: true, order: 2 },
      { type: "scores", enabled: true, order: 3 },
      { type: "summary", enabled: true, order: 4 },
      { type: "attendance", enabled: true, order: 5 },
      { type: "comments", enabled: true, order: 6 },
      { type: "footer", enabled: true, order: 7 }
    ]
  },
  branding: {
    showLogo: true,
    logoPosition: "center",
    fonts: { header: "Helvetica-Bold", body: "Helvetica" }
  },
  scoresTable: {
    showCABreakdown: true,
    showPosition: true
  }
}
```

---

### 7. Dynamic PDF Rendering

**Component**: `DynamicReportCardPDF`
**Location**: `/components/pdf/DynamicReportCardPDF.tsx`

**Process**:

1. **Create Dynamic Styles** (based on template):
   ```typescript
   // Color schemes
   primary: { header: '#1e3a8a', accent: '#3b82f6' }
   grayscale: { header: '#374151', accent: '#6b7280' }
   custom: template.branding.customColors

   // Font sizes
   small: { base: 9, header: 11, title: 13 }
   medium: { base: 10, header: 12, title: 14 }
   large: { base: 11, header: 13, title: 15 }
   ```

2. **Render Sections** (in template order):
   ```typescript
   template.layout.sections
     .filter(s => s.enabled)
     .sort((a, b) => a.order - b.order)
     .map(section => renderSection(section.type))
   ```

3. **Section Renderers**:
   - **Header**: School logo, name, motto, address
   - **Student Info**: Name, admission #, class, term (2-column grid)
   - **Scores Table**:
     ```
     Subject | CA1 | CA2 | CA3 | Exam | Total | Grade
     Math    |  9  |  8  |  9  |  60  |  86   |  A1
     ```
     OR (without CA breakdown):
     ```
     Subject | Total | Grade
     Math    |  86   |  A1
     ```
   - **Summary**: Total, average, overall grade, position, subjects passed/failed
   - **Attendance**: Days present/absent, attendance rate
   - **Comments**: Teacher and principal remarks with signature lines
   - **Footer**: "Generated on [date]" • "Next term begins: [date]"

4. **React-PDF Output**:
   ```jsx
   <Document>
     <Page size="A4" orientation="portrait" style={styles.page}>
       {renderHeader()}
       {renderStudentInfo()}
       {renderScoresTable()}
       {renderSummary()}
       {renderAttendance()}
       {renderComments()}
       {renderFooter()}
     </Page>
   </Document>
   ```

---

### 8. PDF Download

**Process**:
```typescript
// Convert React component to blob
const pdfElement = DynamicReportCardPDF({ data, template });
const blob = await pdf(pdfElement).toBlob();

// Create download URL
const url = URL.createObjectURL(blob);

// Trigger download
const link = document.createElement('a');
link.href = url;
link.download = 'StudentName_Term_Report.pdf';
link.click();

// Cleanup
URL.revokeObjectURL(url);
```

**Filename Format**:
- Single: `James_Thompson_First_Term_2025_Report.pdf`
- Bulk: Multiple files download sequentially with 500ms delay

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/app/dashboard/scores/page.tsx` | Score entry setup (class/subject/term selection) |
| `/app/dashboard/scores/entry/page.tsx` | Score entry form, load existing scores |
| `/app/dashboard/results/page.tsx` | Results landing page (term + class selection) |
| `/app/dashboard/results/class/[classId]/[termId]/page.tsx` | Class results view with download buttons |
| `/lib/pdfGenerator.ts` | Main PDF generation logic, data loading |
| `/lib/reportCardTemplates/templateAssignment.ts` | Template loading with priority system |
| `/components/pdf/DynamicReportCardPDF.tsx` | Dynamic PDF renderer (554 lines) |
| `/components/pdf/ReportCardPDF.tsx` | Legacy static PDF (fallback) |

---

## Database Collections Used

```
students
  ├─ firstName, lastName, admissionNumber
  ├─ currentClassId (links to class)
  └─ isActive

classes
  ├─ name, level
  └─ tenantId

terms
  ├─ name, academicYear
  ├─ startDate, endDate
  ├─ isCurrent
  └─ tenantId

subjects
  ├─ name
  └─ tenantId

scores ⭐
  ├─ studentId, classId, subjectId, termId
  ├─ assessmentScores { ca1, ca2, ca3, exam }
  ├─ total, percentage, grade
  ├─ isPublished (MUST be true for results)
  └─ tenantId

attendance
  ├─ studentId, date, status
  └─ tenantId

reportCardTemplates
  ├─ layout, branding, sections
  ├─ assignedToClasses [], assignedToLevels []
  ├─ isDefault, isActive
  └─ tenantId

tenants
  ├─ name, logo, motto, address
  └─ settings
```

---

## User Flow Summary

1. **Teacher**: Enters scores → Publishes
2. **System**: Calculates totals, grades, rankings
3. **Admin/Teacher**: Views results → Clicks download
4. **System**:
   - Loads all student data
   - Finds appropriate template
   - Generates customized PDF
   - Downloads to user's computer

**Time**: ~2-3 seconds per report card
**Format**: Professional PDF matching school's branding
**Customization**: Fully controlled via report card templates

---

## Troubleshooting

### Results showing 0 students?
- Check students have `currentClassId` matching the class
- Verify students are `isActive: true`
- Ensure scores have `isPublished: true`
- Confirm `termId` matches selected term

### PDF not generating?
- Check all required data exists (student, class, term, scores)
- Verify template is `isActive: true`
- Check browser console for errors
- Ensure scores are published (not draft)

### Scores not loading for editing?
- Verify exact match: classId + subjectId + termId
- Check Firestore composite indexes are deployed
- Confirm user has correct tenantId

### Wrong template being used?
- Check template assignment priority
- Verify template is active (isActive: true)
- Check assignedToClasses or assignedToLevels arrays
- Confirm only one template is marked as default

---

## Future Enhancements

- [ ] Batch PDF generation with progress indicator
- [ ] Email report cards to parents
- [ ] Store generated PDFs in Firebase Storage
- [ ] Comparison with previous terms
- [ ] Graphical performance charts
- [ ] QR code for verification
- [ ] Digital signatures
- [ ] Multi-language support
