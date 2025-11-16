# Report Cards - Quick Reference Guide

## 🎯 Complete Flow (One Page)

```
TEACHER WORKFLOW                           SYSTEM PROCESSING
═══════════════════════════════════════════════════════════════════

📝 ENTER SCORES                            💾 SAVE TO DATABASE
┌─────────────────────────┐                ┌─────────────────────┐
│ 1. Scores > Select:     │                │ Collection: scores  │
│    • Class (Year 1A)    │───────────────>│ • classId           │
│    • Subject (Math)     │                │ • subjectId         │
│    • Term (auto-select) │                │ • termId            │
│                         │                │ • studentId         │
│ 2. Enter for each:      │                │ • total: 86         │
│    • CA1: 9/10         │                │ • grade: "A1"       │
│    • CA2: 8/10         │                │ • isPublished: true │
│    • CA3: 9/10         │                └─────────────────────┘
│    • Exam: 60/70       │
│    = Total: 86/100     │
│    = Grade: A1         │
│                         │
│ 3. Click "Publish"      │
└─────────────────────────┘

                ⬇

📊 VIEW RESULTS                            🔍 QUERY & CALCULATE
┌─────────────────────────┐                ┌─────────────────────┐
│ 1. Results > Select:    │                │ Load published:     │
│    • Term               │───────────────>│ • All scores        │
│    • Class (Year 1A)    │                │ • Students          │
│                         │                │                     │
│ 2. See:                 │<───────────────│ Calculate:          │
│    • Rankings (1st-20th)│                │ • Class average     │
│    • Averages           │                │ • Student ranks     │
│    • Grades             │                │ • Totals            │
│                         │                └─────────────────────┘
│ 3. Click:               │
│    • "Download All (20)"│
│    • or "View Details"  │
└─────────────────────────┘

                ⬇

📄 GENERATE PDF                            🎨 TEMPLATE SYSTEM
┌─────────────────────────┐                ┌─────────────────────┐
│ Single or Bulk Download │                │ 1. Find Template:   │
│                         │───────────────>│    ✓ Class assigned │
│                         │                │    ✓ Level assigned │
│                         │                │    ✓ Default        │
│                         │                │    ✓ Legacy fallback│
│                         │                │                     │
│                         │                │ 2. Load Data:       │
│                         │                │    • Student info   │
│                         │                │    • All scores     │
│                         │                │    • Attendance     │
│                         │                │    • School logo    │
│                         │                │                     │
│                         │                │ 3. Apply Styling:   │
│                         │<───────────────│    • Colors         │
│ "James_Thompson_        │                │    • Fonts          │
│  First_Term_2025_       │                │    • Layout         │
│  Report.pdf"            │                │    • Sections       │
│                         │                │                     │
│ ✅ Downloaded!          │                │ 4. Generate PDF     │
└─────────────────────────┘                └─────────────────────┘
```

---

## 🚀 Quick Start Guide

### For Teachers

**Enter Scores (5 minutes)**
1. Dashboard → **Scores**
2. Select: Class + Subject + Term *(current term auto-selected)*
3. Enter CA1, CA2, CA3, Exam for each student
4. Click **"Publish Scores"**

**Generate Report Cards (30 seconds)**
1. Dashboard → **Results**
2. Select: Term + Class
3. Click **"Download All (X)"**
4. PDFs download automatically

### For Admins

**Create Template (10 minutes)**
1. Dashboard → Settings → **Report Cards**
2. Click **"Create New Template"**
3. Use wizard to customize:
   - Colors, fonts, logo position
   - Enable/disable sections
   - Show/hide CA breakdown
4. Click **"Save Template"**

**Assign Template (2 minutes)**
1. Settings → Report Cards → **"Assign"**
2. Choose: Specific classes OR Class levels
3. Click **"Save Assignment"**

---

## 📋 Key URLs

| Page | URL | Purpose |
|------|-----|---------|
| Score Entry Setup | `/dashboard/scores` | Select class/subject/term |
| Enter Scores | `/dashboard/scores/entry` | Enter CA1, CA2, CA3, Exam |
| View Results | `/dashboard/results` | Select term/class |
| Class Results | `/dashboard/results/class/[id]/[term]` | Download reports |
| Template Manager | `/dashboard/settings/report-cards` | Create/manage templates |
| Template Builder | `/dashboard/settings/report-cards/builder/[id]` | Customize template |
| Assign Template | `/dashboard/settings/report-cards/assign/[id]` | Assign to classes |

---

## 🔑 Key Concepts

### Published vs Draft Scores
- **Draft** (`isDraft: true`): Saved but not visible in results
- **Published** (`isPublished: true`): Visible in results, used for PDFs
- **Toggle**: Edit and re-publish to update

### Template Priority
```
1. Direct → Template assigned to specific class
2. Level  → Template assigned to class level (e.g., "Year 1")
3. Default → School's default template
4. Legacy  → Static fallback
```

### CA Breakdown
- **Shown**: CA1 (9) + CA2 (8) + CA3 (9) + Exam (60) = 86
- **Hidden**: Total (86) + Grade (A1) only

### Grading Scale
| Grade | Score Range | Description |
|-------|-------------|-------------|
| A1 | 75-100 | Excellent |
| B2 | 70-74 | Very Good |
| C4 | 60-69 | Good |
| C6 | 50-59 | Credit |
| D7 | 45-49 | Pass |
| E8 | 40-44 | Pass |
| F9 | 0-39 | Fail |

---

## ⚙️ System Requirements

### Firestore Collections
```
✓ students     - Student records
✓ classes      - Class information
✓ subjects     - Subject list
✓ terms        - Academic terms
✓ scores       - Student scores (PUBLISHED)
✓ attendance   - Attendance records
✓ reportCardTemplates - PDF templates
✓ tenants      - School branding
```

### Required Indexes
```javascript
// scores collection
{
  tenantId + classId + subjectId          // Load existing scores
  tenantId + classId + termId + isPublished  // Results query
  tenantId + studentId + termId + isPublished // Student results
}

// reportCardTemplates collection
{
  tenantId + assignedToClasses + isActive  // Find by class
  tenantId + assignedToLevels + isActive   // Find by level
  tenantId + isDefault + isActive          // Find default
}
```

---

## 🎨 Template Customization Options

### Layout
- **Page Size**: A4, Letter
- **Orientation**: Portrait, Landscape
- **Margins**: Top, Bottom, Left, Right (in points)
- **Color Scheme**: Primary (blue), Grayscale, Custom
- **Font Size**: Small, Medium, Large

### Branding
- **Logo**: Show/hide, position (left/center/right)
- **School Name**: Always shown in header
- **Motto**: Optional tagline
- **Address**: School contact information

### Sections (enable/disable/reorder)
1. Header - School branding
2. Student Info - Name, class, term
3. Scores Table - Subject scores
4. Summary - Totals, average, grade
5. Attendance - Days present/absent
6. Comments - Teacher + principal
7. Footer - Dates, signatures

### Scores Table Options
- **Show CA Breakdown**: Display CA1, CA2, CA3 columns
- **Show Position**: Display student rank
- **Show Grade**: Display letter grade
- **Show Percentage**: Display percentage

---

## 🐛 Common Issues

### "0 students" in Results
**Fix**: Ensure students have `currentClassId` set to the class

### Duplicate Scores
**Fix**: System now auto-loads and updates existing scores (v2.0+)

### Wrong Term Selected
**Fix**: System auto-selects current term + shows warning if changed

### PDF Not Generating
**Check**:
1. Scores are published (not draft)
2. Student exists in class
3. Template is active
4. All required data loaded

### Template Not Applied
**Check**:
1. Template assignment (class/level)
2. Template is active (`isActive: true`)
3. Only one default template
4. Clear browser cache

---

## 📊 Data Flow Summary

```
INPUT                  PROCESS                OUTPUT
────────────────────────────────────────────────────────
Scores Entry      →    Save to Firestore   →  scores collection
                       Calculate totals        (isPublished: true)

View Results      →    Query published     →  Rankings table
                       scores + students       Class statistics

Download PDF      →    Load template       →  Customized PDF
                       Load all data           Professional report
                       Apply styling           School branding
                       Generate PDF            Student-specific
```

---

## 💡 Best Practices

### Entering Scores
✅ Enter for ONE subject at a time (less confusion)
✅ Use "Save as Draft" to save progress
✅ Click "Publish" when all students complete
✅ Check current term is selected (auto-selected)

### Creating Templates
✅ Start with a preset (Classic/Modern/Compact)
✅ Test with sample data before assigning
✅ Keep one template as default
✅ Use descriptive names (e.g., "Primary School - Colorful")

### Assigning Templates
✅ Assign by level for consistency (all Year 1 classes)
✅ Use specific class assignment for special cases
✅ Only activate templates when ready to use
✅ Keep old templates inactive (don't delete)

### Generating PDFs
✅ Generate during off-peak hours (faster)
✅ Test single PDF before bulk download
✅ Check attendance data is up-to-date
✅ Add teacher/principal comments for complete reports

---

## 🔗 Related Documentation

- [Full Flow Diagram](./SCORE_TO_REPORT_CARD_FLOW.md)
- [Score Entry Improvements](../SCORE_ENTRY_IMPROVEMENTS.md)
- [Template Builder Story](./stories/report-card-template-builder.story.md)
- [Results Debugging](../RESULTS_DEBUG_CHECKLIST.md)

---

## 📞 Support

**Issues?** Check:
1. Browser console for errors
2. Firestore indexes deployed
3. Student data complete
4. Scores published (not draft)

**Still stuck?** File an issue with:
- Screenshots
- Console errors
- Step-by-step what you did
