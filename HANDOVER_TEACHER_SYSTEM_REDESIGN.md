# Teacher & User Management System Redesign - Handover Document

**Date:** 2025-01-18
**Status:** In Progress (50% Complete)
**Branch:** main
**Last Commit:** a93d70a - "Remove teacher quota and add class/subject assignment system"

---

## 📋 Project Overview

Complete redesign of teacher management system to support two types of teachers:
1. **Class Teachers** - Assigned to one homeroom class, can enter scores for all subjects in that class
2. **Subject Teachers** - Not assigned to a class, can only enter scores for specific subjects in specific classes

Also streamlining user creation to prevent inconsistencies by routing all user creation through specialized forms.

---

## ✅ Completed Work

### 1. Teacher Creation Form Redesign (`/dashboard/teachers/new`)
**File:** `app/dashboard/teachers/new/page.tsx`

**Changes Made:**
- ✅ **Removed** teacher quota validation (lines 171-205 deleted)
- ✅ **Removed** info box warning about teacher limits (lines 262-267 deleted)
- ✅ **Added** gender field to form data
- ✅ **Added** `classId` field for class teacher assignment (dropdown with "Not a class teacher" option)
- ✅ **Added** `subjectClassMappings` object: `{ [subjectId: string]: string[] }`
- ✅ **Added** expandable subject assignment UI with class selection per subject
- ✅ **Added** collapsible interface with ChevronUp/Down icons
- ✅ **Added** class loading (loads all classes from Firestore)
- ✅ **Updated** form submission to save new fields conditionally

**New Data Structure:**
```typescript
interface FormData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  qualifications: string;
  gender: 'male' | 'female' | '';
  classId: string; // NEW - Class teacher assignment (empty if not class teacher)
  subjectIds: string[];
  subjectClassMappings: { [subjectId: string]: string[] }; // NEW - subject -> class IDs
}
```

**UI Sections:**
1. Basic Information (name, email, phone, gender, photo, bio, qualifications)
2. Class Teacher Assignment (optional dropdown)
3. Subject Teaching Assignments (expandable cards with class checkboxes)

**Key Functions:**
- `handleSubjectToggle()` - Toggle subject selection, clear mappings when unchecked
- `toggleSubjectExpansion()` - Expand/collapse class selection for a subject
- `handleSubjectClassToggle()` - Toggle class selection for a subject
- Form saves only subjects with at least one class selected

**Build Status:** ✅ Successful (tested with `npm run build`)
**Deployment Status:** ✅ Committed and pushed to GitHub

---

## 🚧 Remaining Tasks

### 2. Update Teacher Edit Form (NEXT TASK - HIGH PRIORITY)
**File:** `app/dashboard/teachers/[id]/edit/page.tsx`

**Required Changes:**
- Copy the same structure from teacher creation form
- Load existing teacher data including:
  - `classId`
  - `subjectIds`
  - `subjectClassMappings`
- Pre-populate form with existing values
- Pre-expand subjects that have class mappings
- Use same UI components (expandable subject cards)
- Handle update (not create) - use conditional field inclusion like current implementation
- Load both subjects and classes data
- Add `expandedSubjects` state
- Add same three handler functions

**Important Notes:**
- Current edit form already handles gender, photo, bio, qualifications
- Already has conditional field updates (no undefined values)
- Need to add: classId, subjectClassMappings, classes loading, expansion state
- Keep existing photo delete functionality

---

### 3. Create User Type Selection Modal
**Location:** Create new component or add to Users page
**Purpose:** When clicking "Add User" button, show modal to select user type

**Modal Options:**
1. **Admin** → Navigate to `/dashboard/admin/users/new`
2. **Teacher** → Navigate to `/dashboard/teachers/new`
3. **Parent/Guardian** → Navigate to `/dashboard/guardians/new`

**Implementation Approach:**
- Option A: Create `components/UserTypeModal.tsx` component
- Option B: Add modal state directly in Users page
- Use shadcn Dialog component or custom modal
- Style as cards with icons and descriptions

---

### 4. Update Admin User Creation Form
**File:** `app/dashboard/admin/users/new/page.tsx`

**Required Changes:**
- Remove 'teacher' and 'parent' options from role dropdown (line ~80-120)
- Keep only 'admin' option
- Update any validation that checks for multiple roles
- Update form title/description to clarify it's admin-only

**Current Role Dropdown:**
```typescript
<option value="admin">Admin</option>
<option value="teacher">Teacher</option>  // REMOVE THIS
<option value="parent">Parent</option>   // REMOVE THIS
```

---

### 5. Update Users List Page
**File:** `app/dashboard/admin/users/page.tsx`

**Required Changes:**
- Replace "Add User" button with "Add User" button that opens modal
- Add modal state management
- Add UserTypeModal component import
- Keep existing user list functionality

**Before:**
```typescript
<Button onClick={() => router.push('/dashboard/admin/users/new')}>Add User</Button>
```

**After:**
```typescript
<Button onClick={() => setShowModal(true)}>Add User</Button>
<UserTypeModal open={showModal} onClose={() => setShowModal(false)} />
```

---

### 6. Update Teacher Profile Page (RECOMMENDED)
**File:** `app/dashboard/teachers/[id]/page.tsx`

**Required Changes:**
- Display classId if assigned (show class name instead of ID)
- Display subjectClassMappings in a table/grid
- Example:
  ```
  Class Teacher: JSS 1A

  Subject Teaching:
  - Mathematics: JSS 1A, JSS 1B, JSS 2A
  - Physics: JSS 3A, JSS 3B
  ```

**Current Profile Shows:**
- Assigned class (from `classes` collection where `teacherId` matches)
- Subjects taught (from `subjectIds` array)
- Need to update to show new structure

---

### 7. Update Score Entry Permissions (FUTURE - NOT URGENT)
**Files:**
- `app/dashboard/scores/entry/page.tsx`
- Any score entry logic

**Required Changes:**
- Check if teacher is class teacher (`classId`) → allow all subjects in that class
- Check if teacher is subject teacher → only allow subjects/classes in `subjectClassMappings`
- Combined: Allow both class-based and subject-based permissions

**Current Logic:**
- Likely checks `teacherId` on class assignment
- Needs to be updated to check new fields

---

## 📁 Key Files Modified

1. ✅ `app/dashboard/teachers/new/page.tsx` - Complete rewrite (610 lines)
2. 🚧 `app/dashboard/teachers/[id]/edit/page.tsx` - Needs update
3. 🚧 `app/dashboard/admin/users/new/page.tsx` - Needs role dropdown update
4. 🚧 `app/dashboard/admin/users/page.tsx` - Needs modal addition
5. 🚧 `app/dashboard/teachers/[id]/page.tsx` - Needs display update (optional)

---

## 🗄️ Database Schema Changes

### Users Collection (teachers)
**New Fields:**
```typescript
{
  // Existing fields remain...
  classId?: string;              // NEW - Class ID if class teacher
  subjectClassMappings?: {       // NEW - Subject to classes mapping
    [subjectId: string]: string[]  // Array of class IDs for each subject
  };
}
```

**Example Document:**
```json
{
  "name": "John Doe",
  "email": "john@school.com",
  "role": "teacher",
  "classId": "jss1a_id",
  "subjectIds": ["math_id", "physics_id"],
  "subjectClassMappings": {
    "math_id": ["jss1a_id", "jss1b_id", "jss2a_id"],
    "physics_id": ["jss3a_id", "jss3b_id"]
  }
}
```

**Migration Notes:**
- Existing teachers will not have these fields (undefined)
- Form handles undefined gracefully
- No breaking changes for existing data
- Teachers will need to be edited to add assignments

---

## 🏗️ Technical Implementation Details

### Subject-Class Mapping UI Pattern

**Collapsed State:**
```
☑ Mathematics (MTH101)    [Select Classes (3 selected) ▼]
```

**Expanded State:**
```
☑ Mathematics (MTH101)    [Hide Classes (3 selected) ▲]
   Select which classes this teacher teaches Mathematics to:
   ☑ JSS 1A    ☑ JSS 1B    ☑ JSS 2A
   ☐ JSS 2B    ☐ JSS 3A    ☐ JSS 3B
```

**State Management:**
```typescript
const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
const [formData, setFormData] = useState<FormData>({
  subjectClassMappings: {}, // { subjectId: [classId1, classId2] }
});
```

**Handler Pattern:**
```typescript
const handleSubjectClassToggle = (subjectId: string, classId: string) => {
  setFormData(prev => {
    const currentClasses = prev.subjectClassMappings[subjectId] || [];
    const newClasses = currentClasses.includes(classId)
      ? currentClasses.filter(id => id !== classId)
      : [...currentClasses, classId];

    return {
      ...prev,
      subjectClassMappings: {
        ...prev.subjectClassMappings,
        [subjectId]: newClasses,
      },
    };
  });
};
```

---

## 🧪 Testing Checklist

### Teacher Creation
- [ ] Can create teacher without class assignment (subject teacher only)
- [ ] Can create teacher with class assignment (class teacher)
- [ ] Can create teacher with class AND subject assignments (both roles)
- [ ] Subject expansion/collapse works correctly
- [ ] Class checkboxes toggle properly
- [ ] Form shows correct selected count
- [ ] Mappings only saved for subjects with classes selected
- [ ] Photo upload works
- [ ] All optional fields handled correctly

### Teacher Edit
- [ ] Existing teacher data loads correctly
- [ ] Can update class assignment
- [ ] Can update subject-class mappings
- [ ] Subjects with mappings auto-expand on load
- [ ] Can save without breaking existing data
- [ ] Photo upload/delete works

### User Creation Flow
- [ ] Modal appears when clicking "Add User"
- [ ] Admin option navigates to admin form
- [ ] Teacher option navigates to teacher form
- [ ] Guardian option navigates to guardian form
- [ ] Admin form only shows "admin" role option

### Data Integrity
- [ ] No undefined values saved to Firestore
- [ ] Existing teachers not affected
- [ ] New fields properly structured
- [ ] Class/subject references valid

---

## 🚀 Deployment Steps

1. **Complete remaining tasks** (teacher edit form minimum)
2. **Run build:** `npm run build`
3. **Test locally:** Verify all forms work
4. **Commit changes:**
   ```bash
   git add .
   git commit -m "Complete teacher system redesign with user creation streamlining"
   ```
5. **Push to GitHub:** `git push origin main`
6. **Verify deployment:** Check production site

---

## 💬 Session Restart Prompt

**When starting a new session, say:**

```
Continue the teacher system redesign from the handover document.
Read HANDOVER_TEACHER_SYSTEM_REDESIGN.md in the project root.

Next task: Update the teacher edit form (app/dashboard/teachers/[id]/edit/page.tsx)
to include the same class assignment and subject-class mappings that were added
to the creation form. Use the creation form as a reference.

After completing the edit form, create the user type selection modal and update
the Users page to use it instead of directly navigating to the add user form.

Build, test, and deploy when complete.
```

---

## 📚 Reference Links

- **Teacher Creation Form:** `/dashboard/teachers/new`
- **Teacher Edit Form:** `/dashboard/teachers/[id]/edit`
- **Teacher Profile:** `/dashboard/teachers/[id]`
- **Users Management:** `/dashboard/admin/users`
- **Admin User Form:** `/dashboard/admin/users/new`

---

## 🔍 Key Decisions Made

1. **No teacher quota** - Removed restriction entirely for flexibility
2. **Optional class assignment** - Teachers don't need to be class teachers
3. **Subject-class mapping per subject** - Fine-grained control over teaching assignments
4. **Expandable UI** - Reduces clutter, shows counts when collapsed
5. **Conditional data saving** - Only save mappings with actual class selections
6. **User creation routing** - Modal prevents inconsistent data capture

---

## ⚠️ Important Notes

- Do NOT update types/index.ts yet - fields added directly to form interfaces
- Keep backward compatibility - existing teachers work without new fields
- Score entry permission updates are FUTURE work, not required for MVP
- Focus on teacher create/edit forms first, then user creation flow
- Build and test after each major change

---

**End of Handover Document**
