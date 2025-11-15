# Phase 8: Student Management (TDD Approach)

## Overview
Build complete student (pupil) management system using Test-Driven Development methodology.

## Features to Build

### 1. Students List Page (`/dashboard/students`)
**User Stories:**
- As an admin, I want to see all students in my school
- As an admin, I want to search students by name
- As an admin, I want to filter students by class
- As a teacher, I want to view students in my classes
- As a parent, I want to see only my children

**Components:**
- Student list table with real-time Firestore updates
- Search bar (name, admission number)
- Filter dropdown (class, status)
- Empty state for new schools
- Loading state
- Pagination (if >50 students)

**Data Display:**
- Student photo (placeholder if none)
- Name
- Admission number
- Class
- Age/Date of birth
- Status (active/inactive)
- Action buttons (View, Edit, Delete)

### 2. Add Student Page (`/dashboard/students/new`)
**User Stories:**
- As an admin, I want to add new students
- As an admin, I want to assign students to classes
- As an admin, I want to link students to parent accounts

**Form Fields:**
- Personal Information:
  - First name *
  - Middle name
  - Last name *
  - Date of birth *
  - Gender *
  - Admission number (auto-generated or manual)
  - Admission date *

- Academic Information:
  - Current class *
  - Previous school

- Contact Information:
  - Address
  - Parent/Guardian 1 (link to user account)
  - Parent/Guardian 2 (optional)

- Additional:
  - Photo upload (Firebase Storage)
  - Medical information
  - Notes

**Validation:**
- Required fields marked with *
- Unique admission number check
- Date validations (DOB must be in past, admission date logical)
- Photo size limit (2MB max)

### 3. Edit Student Page (`/dashboard/students/[id]/edit`)
- Pre-populate form with existing data
- Same validation as add form
- Update confirmation
- Audit trail (who modified, when)

### 4. Student Detail Page (`/dashboard/students/[id]`)
**Tabs:**
1. **Overview** - All student information
2. **Classes & Subjects** - Enrolled subjects
3. **Scores** - Academic performance history
4. **Results** - Generated report cards
5. **Attendance** - Attendance records (future)

### 5. Delete Student
- Soft delete (mark as inactive)
- Confirmation dialog
- Admin-only permission
- Cannot delete if has scores (warning + option to archive)

## TDD Implementation Plan

### Step 1: Write Tests for Student List
- [ ] Render empty state
- [ ] Render loading state
- [ ] Render student list from Firestore
- [ ] Search functionality
- [ ] Filter by class
- [ ] Role-based filtering (parent sees only their children)
- [ ] Click "Add Student" navigation
- [ ] Click "Edit" navigation
- [ ] Click "Delete" shows confirmation

### Step 2: Implement Student List
- Create `/app/dashboard/students/page.tsx`
- Create Firestore hooks for real-time updates
- Implement search/filter logic
- Create StudentCard/StudentRow component

### Step 3: Write Tests for Add Student
- [ ] Render form with all fields
- [ ] Validate required fields
- [ ] Validate date fields
- [ ] Submit success creates student in Firestore
- [ ] Submit error displays message
- [ ] Auto-generate admission number option
- [ ] Cancel navigation

### Step 4: Implement Add Student
- Create `/app/dashboard/students/new/page.tsx`
- Create multi-step form or single page form
- Implement Firestore create operation
- Handle photo upload to Storage

### Step 5: Write Tests for Edit Student
- [ ] Pre-populate form with existing data
- [ ] Update existing student
- [ ] Handle not found (404)

### Step 6: Implement Edit Student
- Create `/app/dashboard/students/[id]/edit/page.tsx`
- Fetch student data
- Update Firestore document

### Step 7: Write Tests for Student Detail
- [ ] Display all student information
- [ ] Tab navigation
- [ ] Related data (scores, results)

### Step 8: Implement Student Detail
- Create `/app/dashboard/students/[id]/page.tsx`
- Tabbed interface
- Fetch related collections

## Firestore Schema

```typescript
// Collection: students
interface Student {
  id: string;
  tenantId: string; // School ID (tenant isolation)

  // Personal
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Timestamp;
  gender: 'male' | 'female' | 'other';
  photoURL?: string;

  // Academic
  admissionNumber: string; // Unique per school
  admissionDate: Timestamp;
  currentClassId: string; // Reference to classes collection
  previousSchool?: string;

  // Status
  status: 'active' | 'inactive' | 'graduated' | 'transferred';

  // Contact
  address?: string;
  guardians: Array<{
    userId: string; // Reference to users collection
    relationship: 'father' | 'mother' | 'guardian' | 'other';
    isPrimary: boolean;
  }>;

  // Additional
  medicalInfo?: string;
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string; // User ID
  updatedAt: Timestamp;
  updatedBy: string;
}
```

## Security Rules

```javascript
match /students/{studentId} {
  // Read: Admin and teachers can see all in their school
  // Parents can only see their own children
  allow read: if isAuthenticated() && (
    isAdmin() ||
    isTeacher() ||
    (isParent() && isGuardianOf(studentId))
  );

  // Create/Update: Admin only
  allow create, update: if isAdmin();

  // Delete: Admin only (soft delete)
  allow delete: if isAdmin();

  // Tenant isolation
  allow read, write: if request.resource.data.tenantId == getUserTenant();
}

function isGuardianOf(studentId) {
  return exists(/databases/$(database)/documents/students/$(studentId))
    && get(/databases/$(database)/documents/students/$(studentId))
      .data.guardians.hasAny([request.auth.uid]);
}
```

## Component Structure

```
app/dashboard/students/
├── page.tsx                    // Student list
├── new/
│   └── page.tsx               // Add student form
├── [id]/
│   ├── page.tsx               // Student detail
│   └── edit/
│       └── page.tsx           // Edit student form
└── components/
    ├── StudentList.tsx        // Table/grid view
    ├── StudentCard.tsx        // Individual student card
    ├── StudentForm.tsx        // Reusable form for add/edit
    ├── StudentFilters.tsx     // Search and filter UI
    ├── DeleteConfirmation.tsx // Delete dialog
    └── StudentTabs.tsx        // Detail page tabs
```

## API Routes (Optional - can use Firestore directly)

```
POST   /api/students          // Create student
GET    /api/students          // List students (with filters)
GET    /api/students/[id]     // Get single student
PUT    /api/students/[id]     // Update student
DELETE /api/students/[id]     // Delete (soft) student
POST   /api/students/import   // Bulk import from Excel
```

## Testing Strategy

### Unit Tests
- StudentForm validation logic
- StudentFilters search/filter logic
- Date calculations (age from DOB)

### Integration Tests
- Firestore CRUD operations
- Role-based data filtering
- Guardian relationship validation

### E2E Tests (Future)
- Complete add student flow
- Search and filter workflow
- Edit and delete workflow

## Success Metrics

- [ ] All tests passing (>90% coverage)
- [ ] Can add 100+ students without performance issues
- [ ] Real-time updates working (add student in one tab, see in another)
- [ ] Search returns results in <200ms
- [ ] Mobile-responsive on all screen sizes
- [ ] Accessibility: Keyboard navigation, screen reader friendly

## Next Phase Preview

**Phase 9: Score Entry**
- Once students exist, we can enter scores
- Bulk score entry interface
- Grade calculation
- Score publishing (visible to parents)
