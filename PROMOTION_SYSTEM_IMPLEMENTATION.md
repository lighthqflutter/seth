# Student Promotion System - Implementation Plan

**Date:** 2025-01-19
**Status:** In Progress
**Feature:** Complete student promotion and graduation management system

---

## Overview

A comprehensive promotion system that allows schools to manage end-of-year student promotions with:
- Configurable automatic criteria or manual decision-making
- Teacher-assisted workflow with admin coordination
- Batch processing for scalability (500+ students)
- Graduation handling with certificates and transcripts
- Complete audit trail and rollback capability

---

## Implementation Phases

### Phase 1: ✅ Data Structure & Types (COMPLETED)

**Files Modified:**
- `types/index.ts` - Added promotion interfaces

**New Interfaces Added:**
1. `PromotionSettings` - Configuration for promotion rules
2. `PromotionCampaign` - Annual promotion campaign
3. `PromotionRecord` - Individual student promotion decision
4. `PromotionExecution` - Batch execution tracking

**Student Model Updates:**
- Added `status` field (active | graduated | etc.)
- Added graduation fields (graduatedAt, graduationYear, etc.)
- Added `promotionHistory` array

---

### Phase 2: Promotion Settings UI

**Location:** `/dashboard/settings/promotion`
**Access:** Admins only

**Components to Build:**
1. `app/dashboard/settings/promotion/page.tsx` - Main settings page
2. Tab 1: Promotion Mode & Criteria
3. Tab 2: Class Progression Mapping
4. Tab 3: Graduation Settings
5. Tab 4: Workflow & Permissions

**Features:**
- Configure automatic vs manual promotion mode
- Set eligibility criteria (average score, subjects passed, core subjects, attendance)
- Map class levels (JSS 1 → JSS 2, SS 3 → GRADUATED)
- Define graduation requirements
- Configure approval workflow

---

### Phase 3: Admin Promotion Campaign Dashboard

**Location:** `/dashboard/promotion`
**Access:** Admins (full), Class Teachers (limited)

**Components to Build:**
1. `app/dashboard/promotion/page.tsx` - Campaign list
2. `app/dashboard/promotion/new/page.tsx` - Create campaign
3. `app/dashboard/promotion/[id]/page.tsx` - Campaign details
4. `components/promotion/CampaignOverview.tsx` - Progress dashboard
5. `components/promotion/ClassSubmissionCard.tsx` - Per-class status

**Features:**
- Create promotion campaigns (e.g., "End of Year 2024/2025")
- Set submission deadlines for teachers
- View progress (submitted vs pending classes)
- Review all teacher submissions
- See target class capacity planning
- Execute all promotions in coordinated batch

---

### Phase 4: Teacher Submission Interface

**Location:** Embedded in `/dashboard/students` page
**Access:** Class Teachers (their class only)

**Components to Build:**
1. `components/promotion/PromoteClassButton.tsx` - Button in students list
2. `components/promotion/PromotionModal.tsx` - Multi-step modal
3. `components/promotion/StudentEligibilityCard.tsx` - Individual student review
4. `components/promotion/PromotionSummary.tsx` - Preview before submission

**Features:**
- Analyze student eligibility based on criteria
- Categorize: Auto-promote, Review required, Cannot promote
- Manual override capability with justification
- Graduation handling for graduating classes
- Submit decisions to admin (non-destructive)

---

### Phase 5: Promotion Execution Backend

**Location:** Cloud Functions
**Files to Create:**
1. `functions/src/promotion/executePromotion.ts` - Main execution
2. `functions/src/promotion/promotionHelpers.ts` - Utility functions
3. `functions/src/promotion/notificationHandlers.ts` - Email/SMS

**Features:**
- Batch processing (50 students per batch)
- Real-time progress tracking
- Error handling and retry logic
- Firestore transaction safety
- Pause/resume capability
- Parent notification emails

**Cloud Functions:**
```typescript
// Triggered when admin clicks "Execute Campaign"
export const executePromotionCampaign = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .firestore
  .document('promotion_executions/{executionId}')
  .onCreate(async (snap, context) => {
    // Process in batches of 50
    // Update progress in real-time
    // Handle errors gracefully
  });
```

---

### Phase 6: Graduation Features

**Components to Build:**
1. `app/dashboard/students/graduated/page.tsx` - Graduated students view
2. `components/graduation/GraduationReview.tsx` - Review graduating students
3. `components/graduation/CertificateGenerator.tsx` - PDF certificate
4. `components/graduation/TranscriptGenerator.tsx` - PDF transcript

**Features:**
- Separate view for graduated students
- Certificate generation (PDF)
- Transcript generation (PDF)
- Alumni data retention
- Read-only access to historical records

---

### Phase 7: Execution Progress UI

**Components to Build:**
1. `components/promotion/ExecutionProgress.tsx` - Real-time progress
2. `components/promotion/ExecutionLog.tsx` - Activity log
3. `components/promotion/ErrorList.tsx` - Failed operations

**Features:**
- Real-time progress bar
- Per-class breakdown
- Live activity log
- Error tracking
- Pause/cancel capability

---

### Phase 8: History & Audit Trail

**Components to Build:**
1. `app/dashboard/promotion/history/page.tsx` - Past campaigns
2. `components/promotion/CampaignHistoryCard.tsx` - Historical record
3. `components/promotion/PromotionDetailsTable.tsx` - Student-level details

**Features:**
- View past promotion campaigns
- Export reports (CSV, PDF)
- Audit trail (who did what when)
- Rollback capability (with safety checks)

---

## Database Collections

### New Collections:

1. **`promotion_campaigns`**
   - Stores annual promotion campaigns
   - Tracks overall progress and status

2. **`promotion_records`**
   - Individual student promotion decisions
   - One record per student per campaign
   - Stores performance data and rationale

3. **`promotion_executions`**
   - Tracks batch execution progress
   - Real-time status updates
   - Error logging

### Updated Collections:

1. **`students`**
   - Added graduation fields
   - Added promotion history
   - Added status field

2. **`tenants`**
   - Added `promotion` settings to `settings` object

---

## Permission Matrix

| Feature                     | Admin | Class Teacher | Subject Teacher | Parent |
|-----------------------------|-------|---------------|-----------------|--------|
| Configure promotion settings| ✅    | ❌            | ❌              | ❌     |
| Create promotion campaign   | ✅    | ❌            | ❌              | ❌     |
| View campaign (own class)   | ✅    | ✅            | ❌              | ❌     |
| View campaign (all classes) | ✅    | ❌            | ❌              | ❌     |
| Submit class for promotion  | ✅    | ✅            | ❌              | ❌     |
| Manual override decisions   | ✅    | ✅*           | ❌              | ❌     |
| Approve submissions         | ✅    | ❌            | ❌              | ❌     |
| Execute promotions          | ✅    | ❌            | ❌              | ❌     |
| View promotion history      | ✅    | ✅ (own)      | ❌              | ❌     |
| Rollback promotions         | ✅    | ❌            | ❌              | ❌     |

\* Depends on workflow settings

---

## Implementation Order

1. ✅ **Phase 1:** Data structures and types (COMPLETED)
2. **Phase 2:** Promotion settings UI (Admin configuration)
3. **Phase 3:** Campaign creation and dashboard (Admin)
4. **Phase 4:** Teacher submission interface
5. **Phase 5:** Backend execution logic (Cloud Functions)
6. **Phase 6:** Graduation features
7. **Phase 7:** Progress tracking UI
8. **Phase 8:** History and audit trail

---

## Key Technical Decisions

### Scalability
- **Batch Size:** 50 students per batch (under Firestore 500-write limit)
- **Timeout:** 9-minute Cloud Function timeout
- **Progress Tracking:** Real-time Firestore updates
- **Memory:** 2GB allocated for large schools

### Workflow
- **Campaign-Based:** All promotions coordinated through campaigns
- **Teacher Submission:** Non-destructive drafts
- **Admin Execution:** Single atomic operation across all classes
- **No Race Conditions:** Submissions don't execute, admin coordinates

### Safety
- **Confirmation Steps:** Multiple previews before execution
- **Audit Trail:** Complete logging of all decisions
- **Rollback:** Capability to undo promotions (within limits)
- **Error Handling:** Graceful failure with detailed error messages

---

## Next Steps

1. Build promotion settings UI (`/dashboard/settings/promotion`)
2. Build admin campaign dashboard (`/dashboard/promotion`)
3. Integrate teacher submission into students page
4. Create Cloud Functions for batch execution
5. Add graduation certificate/transcript generation
6. Test with sample data (500+ students)
7. Deploy and document

---

## Testing Strategy

### Unit Tests
- Eligibility calculation logic
- Batch processing functions
- Criteria evaluation

### Integration Tests
- End-to-end promotion flow
- Campaign creation to execution
- Teacher submission workflow

### Performance Tests
- 500-student batch execution
- Concurrent teacher submissions
- Progress tracking under load

### Edge Cases
- Students with missing data
- Class capacity overflow
- Failed batch recovery
- Partial execution scenarios

---

**Last Updated:** 2025-01-19
**Status:** Ready to proceed with Phase 2 (Settings UI)
