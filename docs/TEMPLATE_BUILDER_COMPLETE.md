# Report Card Template Builder - Complete System Overview

## ✅ Implementation Status

**ALL PHASES COMPLETED** (Phases 1-11)

The Report Card Template Visual Builder is fully implemented and ready to use!

---

## 🎯 What's Been Built

### Phase 1-3: Foundation ✅
- ✅ Database schema and TypeScript types
- ✅ Firestore security rules and indexes
- ✅ 4 professional template presets (Classic, Modern, Compact, Comprehensive)
- ✅ Template validation system
- ✅ CRUD utilities (create, read, update, delete, clone)
- ✅ Template management page with cards
- ✅ Auto-migration for existing schools

### Phase 4-8: Visual Builder Wizard ✅
- ✅ **Step 1**: Template selection (choose from 4 presets or start from scratch)
- ✅ **Step 2**: Section configuration (enable/disable/reorder sections)
- ✅ **Step 3**: Branding & styling (colors, fonts, logo position)
- ✅ **Step 4**: Layout customization (advanced drag-drop mode)
- ✅ **Step 5**: Preview & save (real-time preview, save template)

### Phase 9-11: Assignment & Generation ✅
- ✅ **Template Assignment**: Assign to specific classes or class levels
- ✅ **Dynamic PDF Renderer**: 554-line component renders templates
- ✅ **Integration**: Seamless integration with existing report card system

---

## 📁 File Structure

```
school-portal/
├── app/dashboard/settings/report-cards/
│   ├── page.tsx                           # Template management page
│   ├── components/
│   │   └── TemplateCard.tsx              # Template display card
│   ├── assign/[templateId]/
│   │   └── page.tsx                       # Assignment interface
│   └── builder/[templateId]/
│       ├── page.tsx                       # Main wizard orchestrator
│       └── components/wizard/
│           ├── Step1SelectTemplate.tsx    # Choose preset
│           ├── Step2ConfigureSections.tsx # Section config
│           ├── Step3Branding.tsx          # Branding/styling
│           ├── Step4Layout.tsx            # Layout customization
│           └── Step5Preview.tsx           # Preview & save
│
├── lib/reportCardTemplates/
│   ├── presets.ts              # 4 professional presets
│   ├── validators.ts           # Template validation
│   ├── templateCRUD.ts         # Create/read/update/delete
│   ├── templateAssignment.ts   # Assignment utilities
│   ├── migration.ts            # Auto-migration tools
│   └── defaultTemplate.ts      # Default template generator
│
├── components/pdf/
│   ├── DynamicReportCardPDF.tsx  # Dynamic PDF renderer (554 lines)
│   └── ReportCardPDF.tsx          # Legacy static template
│
├── types/
│   └── reportCardTemplate.ts   # TypeScript definitions
│
└── docs/
    ├── SCORE_TO_REPORT_CARD_FLOW.md      # Complete flow documentation
    ├── QUICK_REFERENCE_REPORT_CARDS.md   # User quick guide
    └── stories/
        └── report-card-template-builder.story.md  # Full requirements
```

---

## 🚀 How to Use

### For School Administrators

#### 1. Access Template Manager
```
Dashboard → Settings → Report Cards
```

First time? A default "Classic" template is auto-created matching your current report card design.

#### 2. Create New Template

**Option A: Use Preset (Recommended)**
1. Click "Create New Template"
2. Choose from 4 presets:
   - **Classic**: Traditional design with formal layout
   - **Modern**: Clean, minimalist with color accents
   - **Compact**: Single-page, essential info only
   - **Comprehensive**: Multi-page with detailed analytics

**Option B: Clone Existing Template**
1. Find template to copy
2. Click "Clone"
3. Edit as needed

#### 3. Customize with Wizard

**Step 1: Select Template**
- Choose preset or start from scratch
- See preview of each option

**Step 2: Configure Sections**
- Enable/disable sections:
  - ✓ Header (school info)
  - ✓ Student Info
  - ✓ Scores Table
  - ✓ Summary (totals, average, grade)
  - ✓ Attendance
  - ✓ Skills/Conduct
  - ✓ Teacher Comments
  - ✓ Principal Comments
  - ✓ Footer
- Drag to reorder sections
- Configure each section's display options

**Step 3: Branding & Styling**
- Logo position: Left | Center | Right
- Color scheme: Primary | Grayscale | Custom
- Font size: Small | Medium | Large
- Show/hide: School name, motto, address
- Header style: Classic | Modern | Minimal

**Step 4: Layout (Advanced)**
- Choose page size: A4 | Letter
- Orientation: Portrait | Landscape
- Margins: Top, Bottom, Left, Right
- *Optional*: Unlock custom drag-drop layout

**Step 5: Preview & Save**
- See live preview with sample data
- Download test PDF
- Enter template name & description
- Set as default (optional)
- Save

#### 4. Assign to Classes

**Option A: Assign to All Classes**
1. Template card → Click "Assign"
2. Click "Assign to All Classes"

**Option B: Assign to Class Levels**
1. Template card → Click "Assign"
2. Select levels (e.g., Year 1, Year 2)
3. All classes in those levels use this template

**Option C: Assign to Specific Classes**
1. Template card → Click "Assign"
2. Select individual classes
3. Save assignment

#### 5. Generate Report Cards

Report cards automatically use assigned templates!

1. Go to Results → Select Term → Select Class
2. Click "Download All (X)" or individual "Download"
3. PDFs generated with your custom template
4. Professional, branded reports matching your design

---

## 🎨 Template Features

### 4 Professional Presets

#### 1. Classic Template
```
Perfect for: Traditional schools, formal presentations
Features:
- Formal header with school crest
- Structured layout with clear sections
- Conservative color palette
- CA breakdown visible
- Emphasis on grades and position
```

#### 2. Modern Template
```
Perfect for: Contemporary schools, clean aesthetics
Features:
- Minimalist header
- Color accents for visual interest
- Open white space
- Streamlined information display
- Focus on readability
```

#### 3. Compact Template
```
Perfect for: Single-page reports, eco-friendly printing
Features:
- Dense but readable layout
- Essential information only
- Small margins
- Compact fonts
- No unnecessary sections
```

#### 4. Comprehensive Template
```
Perfect for: Detailed assessments, multi-page reports
Features:
- Complete student analytics
- Extended comments sections
- Skills breakdown
- Attendance details
- Performance graphs (future)
- Multi-page layout
```

### Customization Options

| Feature | Options |
|---------|---------|
| **Logo** | Show/Hide, Left/Center/Right |
| **Color Scheme** | Primary (blue), Grayscale, Custom colors |
| **Font Size** | Small (9pt), Medium (10pt), Large (11pt) |
| **Page Size** | A4, Letter |
| **Orientation** | Portrait, Landscape |
| **Margins** | Custom (top, right, bottom, left) |
| **CA Breakdown** | Show individual CA1/CA2/CA3 or total only |
| **Grades** | Show/Hide letter grades |
| **Position** | Show/Hide class ranking |
| **Percentage** | Show/Hide percentage scores |
| **Comments** | Teacher only, Principal only, Both, or None |
| **Attendance** | Days present, absent, rate |
| **Skills** | Table, Grid, or List layout |

---

## 🔧 Technical Details

### Template Data Structure

```typescript
interface ReportCardTemplate {
  // Metadata
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;

  // Assignment
  assignedToClasses: string[];    // Specific class IDs
  assignedToLevels: string[];     // e.g., ["Year 1", "Year 2"]

  // Layout Configuration
  layout: {
    mode: 'preset' | 'custom';
    pageSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: { top: number; right: number; bottom: number; left: number };
    colorScheme: 'primary' | 'grayscale' | 'custom';
    fontSize: 'small' | 'medium' | 'large';
    sections: SectionConfig[];     // Enabled sections in order
  };

  // Branding
  branding: {
    logoPosition: 'left' | 'center' | 'right';
    showLogo: boolean;
    showSchoolName: boolean;
    showMotto: boolean;
    showAddress: boolean;
    headerStyle: 'classic' | 'modern' | 'minimal';
    customColors?: { primary: string; secondary: string; };
    fonts?: { header: string; body: string; };
  };

  // Scores Table
  scoresTable: {
    columns: string[];
    showCABreakdown: boolean;
    showPercentage: boolean;
    showGrade: boolean;
    showRemark: boolean;
    showPosition: boolean;
    remarkType: 'auto' | 'teacher' | 'both';
  };

  // Comments
  comments: {
    showTeacherComment: boolean;
    showPrincipalComment: boolean;
    maxLength: number;
    showSignature: boolean;
  };

  // Attendance
  attendance: {
    enabled: boolean;
    showDaysPresent: boolean;
    showDaysAbsent: boolean;
    showAttendanceRate: boolean;
  };

  // Skills/Conduct
  skills: {
    enabled: boolean;
    displayStyle: 'table' | 'grid' | 'list';
    showDescriptions: boolean;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### Template Priority System

When generating a report card, the system finds the template using this priority:

```
1. Direct Assignment
   └─ Template assigned directly to the student's class

2. Level Assignment
   └─ Template assigned to the class level (e.g., "Year 1")

3. Default Template
   └─ School's default template (isDefault: true)

4. Legacy Fallback
   └─ Hardcoded template (backward compatibility)
```

**Code**: `/lib/reportCardTemplates/templateAssignment.ts:70-131`

### Dynamic PDF Generation

The `DynamicReportCardPDF` component (554 lines) renders templates:

```typescript
// Load template for class
const template = await getTemplateForClass(classId, tenantId);

if (template) {
  // Use dynamic renderer
  const pdf = DynamicReportCardPDF({ data, template });
} else {
  // Fallback to legacy
  const pdf = ReportCardPDF({ data });
}
```

**Features**:
- Template-driven styling (colors, fonts, margins)
- Conditional section rendering
- Dynamic column visibility
- Layout modes (preset vs custom)
- Real-time preview support

**Code**: `/components/pdf/DynamicReportCardPDF.tsx`

---

## 🗄️ Database Collections

### reportCardTemplates

```javascript
{
  // Document ID (auto-generated)

  // Fields
  tenantId: "school_abc123",
  name: "Modern Blue Theme",
  description: "Clean, professional design with blue accents",
  isDefault: false,
  isActive: true,
  assignedToClasses: ["class_id_1", "class_id_2"],
  assignedToLevels: ["Year 1", "Year 2"],
  layout: { /* ... */ },
  branding: { /* ... */ },
  scoresTable: { /* ... */ },
  comments: { /* ... */ },
  attendance: { /* ... */ },
  skills: { /* ... */ },
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "user_id"
}
```

### Indexes Required

```json
{
  "collectionGroup": "reportCardTemplates",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "isActive", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "reportCardTemplates",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "isDefault", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "reportCardTemplates",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "assignedToClasses", "arrayConfig": "CONTAINS" }
  ]
},
{
  "collectionGroup": "reportCardTemplates",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "assignedToLevels", "arrayConfig": "CONTAINS" }
  ]
}
```

**Status**: ✅ All indexes deployed

### Security Rules

```javascript
match /reportCardTemplates/{templateId} {
  // Read: Anyone in tenant
  allow read: if request.auth != null &&
                 resource.data.tenantId == getUserTenant();

  // Create: Admins only
  allow create: if isAdmin() &&
                   request.resource.data.tenantId == getUserTenant();

  // Update: Admins only, same tenant
  allow update: if isAdmin() &&
                   resource.data.tenantId == getUserTenant() &&
                   request.resource.data.tenantId == getUserTenant();

  // Delete: Admins only
  allow delete: if isAdmin() &&
                   resource.data.tenantId == getUserTenant();
}
```

**Status**: ✅ Rules deployed

---

## 🧪 Testing Checklist

### Template Management
- [x] Create new template from preset
- [x] Clone existing template
- [x] Edit template
- [x] Delete template (with confirmation)
- [x] Set/unset default template
- [x] Activate/deactivate template
- [x] View template list
- [x] Auto-migration on first access

### Wizard Steps
- [x] Step 1: Select preset, see preview
- [x] Step 2: Enable/disable sections, reorder
- [x] Step 3: Customize branding, change colors
- [x] Step 4: Adjust layout, set margins
- [x] Step 5: Preview PDF, save template

### Template Assignment
- [x] Assign to all classes
- [x] Assign to specific classes
- [x] Assign to class levels
- [x] Unassign from classes
- [x] View assignment summary
- [x] Prevent deletion of assigned templates

### PDF Generation
- [x] Generate with direct class assignment
- [x] Generate with level assignment
- [x] Generate with default template
- [x] Fallback to legacy if no template
- [x] Bulk generation with mixed assignments
- [x] Preview matches generated PDF

---

## 📊 Feature Comparison

| Feature | Legacy (Hardcoded) | Template System |
|---------|-------------------|-----------------|
| Customization | None | Full |
| Branding | Fixed | Flexible (logo, colors, fonts) |
| Sections | All included | Enable/disable any section |
| Layout | Portrait A4 only | A4/Letter, Portrait/Landscape |
| Colors | Blue only | Primary/Grayscale/Custom |
| Per-Class | No | Yes (assign different templates) |
| Preview | No | Yes (real-time) |
| Multi-Page | No | Yes (Comprehensive preset) |
| CA Breakdown | Always shown | Optional |
| Position | Always shown | Optional |

---

## 🎓 Common Use Cases

### Use Case 1: Different Templates for Different Levels

**Scenario**: Primary school wants colorful reports, secondary wants formal

**Solution**:
1. Create "Primary Colorful" template (Modern preset, custom colors)
2. Create "Secondary Formal" template (Classic preset, grayscale)
3. Assign "Primary Colorful" to levels: Year 1, Year 2, Year 3
4. Assign "Secondary Formal" to levels: JSS1, JSS2, JSS3, SS1, SS2, SS3

**Result**: Each level automatically gets appropriate template

### Use Case 2: Single-Page vs Multi-Page

**Scenario**: Some classes need single-page for quick printing, others need detailed analysis

**Solution**:
1. Create "Quick Summary" template (Compact preset)
2. Create "Detailed Analysis" template (Comprehensive preset)
3. Assign Compact to classes with 50+ students (faster printing)
4. Assign Comprehensive to smaller classes (more detail)

**Result**: Optimized reports per class size

### Use Case 3: Hide CA Breakdown for Parents

**Scenario**: School wants to show only final grades to parents, not CA details

**Solution**:
1. Clone existing template
2. Step 2 → Scores Table → Uncheck "Show CA Breakdown"
3. Assign to all classes

**Result**: Parents see final scores and grades only

### Use Case 4: Add School Motto to Header

**Scenario**: New school motto needs to appear on all report cards

**Solution**:
1. Edit default template
2. Step 3 → Branding → Check "Show Motto"
3. Save template

**Result**: All future reports include motto

---

## 🔄 Migration Strategy

### Existing Schools

When existing schools access Report Cards settings for the first time:

1. **Auto-Migration**:
   - System checks if school has any templates
   - If none, creates "Default Classic" template
   - Matches current hardcoded design exactly
   - Sets as default template
   - All existing report card generation continues to work

2. **Gradual Adoption**:
   - Schools can continue using default template
   - Or customize it whenever ready
   - Or create new templates and assign selectively

3. **Backward Compatibility**:
   - If template system fails, falls back to legacy
   - No disruption to existing functionality

**Code**: `/lib/reportCardTemplates/migration.ts`

---

## 📈 Future Enhancements

Potential future additions:

- [ ] Performance graphs (visual charts)
- [ ] Subject-specific templates (Math template, Language template)
- [ ] Parent portal with template selection
- [ ] Multi-language templates
- [ ] QR code integration for verification
- [ ] Digital signatures
- [ ] Template marketplace (share templates)
- [ ] A/B testing (preview multiple templates)
- [ ] Analytics (which templates most used)
- [ ] Bulk import/export templates

---

## 🐛 Troubleshooting

### Template not appearing in assignment?
- Check template is `isActive: true`
- Verify same `tenantId`
- Refresh page

### PDF using wrong template?
- Check assignment priority (direct > level > default)
- Verify class has correct `level` field
- Check only one template is default

### Changes not showing in preview?
- Click "Next" to save step changes
- Preview uses current wizard state
- Download test PDF to verify

### Can't delete template?
- Check if template is assigned to classes
- Check if template is default (cannot delete)
- Unassign first, then delete

---

## 📚 Related Documentation

- [Complete Flow: Score to Report Card](./SCORE_TO_REPORT_CARD_FLOW.md)
- [Quick Reference Guide](./QUICK_REFERENCE_REPORT_CARDS.md)
- [Story Document](./stories/report-card-template-builder.story.md)
- [Score Entry Improvements](../SCORE_ENTRY_IMPROVEMENTS.md)

---

## ✅ Summary

The Report Card Template Builder is **complete and production-ready**:

- ✅ All 11 phases implemented
- ✅ 5-step wizard interface
- ✅ 4 professional presets
- ✅ Full customization options
- ✅ Template assignment system
- ✅ Dynamic PDF generation
- ✅ Backward compatibility
- ✅ Auto-migration for existing schools
- ✅ Tested and building successfully

**Start using**: Dashboard → Settings → Report Cards → Create New Template

Enjoy creating beautiful, branded report cards for your school! 🎉
