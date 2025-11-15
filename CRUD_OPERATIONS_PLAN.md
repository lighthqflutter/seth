# CRUD Operations Status & Implementation Plan

## Current Status

### ✅ **Completed**
1. **Authentication** - Login, Registration (School onboarding)
2. **Students (Partial)** - List view with search/filter ✅

### ❌ **Not Yet Implemented**
The following CRUD operations are **planned but not yet built**:

1. Classes
2. Subjects
3. Teachers
4. Assessments (CA1, CA2, CA3)
5. Exams
6. Projects
7. Class-Teacher Assignments
8. Subject-Teacher Assignments
9. Terms (Academic periods)
10. Guardians/Parents

---

## TypeScript Interfaces Available

All entity types are already defined in `types/index.ts`:
- ✅ Student
- ✅ Class
- ✅ Subject
- ✅ Term
- ✅ Score (includes ca1, ca2, ca3, exam, project)
- ✅ Result
- ✅ Guardian
- ✅ User (Teacher/Admin/Parent)
- ✅ Tenant (School)

**This means the data model is ready** - we just need to build the UI and CRUD operations!

---

## Recommended Implementation Order

### **Phase 8A: Foundation Entities** (Current - Priority 1)
These must be completed FIRST before scores can be entered:

#### 1. **Classes** (JSS1A, SS2B, etc.)
**Why First?** Students need to be assigned to classes

**CRUD Operations:**
- [ ] List all classes (with student count)
- [ ] Add new class (name, level, academic year)
- [ ] Edit class details
- [ ] Delete class (check if has students)
- [ ] Assign class teacher

**Priority**: 🔴 **CRITICAL** - Needed for student assignments

**Estimated**: 2-3 hours with TDD

---

#### 2. **Subjects** (Mathematics, English, etc.)
**Why Second?** Scores need subjects

**CRUD Operations:**
- [ ] List all subjects
- [ ] Add new subject (name, code, max score)
- [ ] Edit subject
- [ ] Delete subject (check if has scores)
- [ ] Assign to classes (optional)

**Priority**: 🔴 **CRITICAL** - Needed for score entry

**Estimated**: 1-2 hours with TDD

---

#### 3. **Teachers** (Complete Student CRUD first)
**Why Third?** Needed to assign class teachers and subject teachers

**CRUD Operations:**
- [ ] List all teachers
- [ ] Add new teacher (creates User account)
- [ ] Edit teacher profile
- [ ] Deactivate teacher
- [ ] Assign to classes
- [ ] Assign to subjects

**Priority**: 🟡 **HIGH** - Needed for assignments

**Estimated**: 3-4 hours with TDD

---

#### 4. **Academic Terms**
**Why Fourth?** Scores are tracked per term

**CRUD Operations:**
- [ ] List all terms
- [ ] Add new term (name, start/end dates, academic year)
- [ ] Edit term
- [ ] Delete term (check if has scores)
- [ ] Mark term as current

**Priority**: 🔴 **CRITICAL** - Needed for score entry

**Estimated**: 1-2 hours with TDD

---

### **Phase 8B: Complete Students** (Priority 2)

#### 5. **Students - Add/Edit/Delete**
**Currently**: Only list view exists ✅

**Remaining CRUD:**
- [ ] Add student form (multi-step wizard)
- [ ] Edit student
- [ ] Delete student (soft delete)
- [ ] Student detail page with tabs
- [ ] Photo upload
- [ ] Assign to class
- [ ] Link guardians

**Priority**: 🟡 **HIGH**

**Estimated**: 4-5 hours with TDD

---

### **Phase 8C: Relationships** (Priority 3)

#### 6. **Class-Teacher Assignments**
**Purpose**: Assign a class teacher to each class

**CRUD Operations:**
- [ ] View class teacher assignments
- [ ] Assign teacher to class
- [ ] Reassign class teacher
- [ ] Remove assignment

**Priority**: 🟢 **MEDIUM**

**Estimated**: 1 hour with TDD

---

#### 7. **Subject-Teacher Assignments**
**Purpose**: Assign teachers to subjects they teach

**CRUD Operations:**
- [ ] View subject-teacher assignments
- [ ] Assign teacher to subject (per class)
- [ ] Reassign teacher
- [ ] Remove assignment

**Priority**: 🟢 **MEDIUM**

**Estimated**: 1-2 hours with TDD

---

#### 8. **Guardians/Parents**
**Purpose**: Manage parent accounts and link to students

**CRUD Operations:**
- [ ] List all guardians
- [ ] Add guardian (with/without login)
- [ ] Edit guardian info
- [ ] Link guardian to student(s)
- [ ] Unlink guardian
- [ ] Send login credentials

**Priority**: 🟢 **MEDIUM**

**Estimated**: 2-3 hours with TDD

---

## Phase 9: Score Entry System (Priority 4)

**Depends on**: Classes ✅, Subjects ✅, Terms ✅, Students ✅, Teachers ✅

### **9A. Assessments (CA1, CA2, CA3)**

**CRUD Operations:**
- [ ] Select class + subject + assessment type
- [ ] Bulk entry interface (table view)
- [ ] Enter CA1 scores for all students
- [ ] Enter CA2 scores for all students
- [ ] Enter CA3 scores for all students
- [ ] Auto-calculate totalCA
- [ ] Save drafts
- [ ] Publish scores

**Priority**: 🔴 **CRITICAL**

**Estimated**: 4-5 hours with TDD

---

### **9B. Exams**

**CRUD Operations:**
- [ ] Select class + subject
- [ ] Bulk entry for exam scores
- [ ] Auto-calculate total (CA + Exam)
- [ ] Auto-assign grades (A-F based on score)
- [ ] Add teacher comments
- [ ] Publish exam scores

**Priority**: 🔴 **CRITICAL**

**Estimated**: 2-3 hours with TDD

---

### **9C. Projects** (Optional)

**CRUD Operations:**
- [ ] Select class + subject
- [ ] Enter project scores
- [ ] Include in total calculation
- [ ] Add project comments

**Priority**: 🟢 **LOW** (Optional component)

**Estimated**: 1-2 hours with TDD

---

## Phase 10: Results & Reports (Priority 5)

**Depends on**: All scores entered ✅

### **10A. Result Generation**

**Operations:**
- [ ] Generate consolidated results for student
- [ ] Calculate class rankings
- [ ] Add principal/teacher comments
- [ ] Generate PDF report cards
- [ ] Batch generate for entire class
- [ ] Email to parents

**Priority**: 🟡 **HIGH**

**Estimated**: 5-6 hours with TDD

---

### **10B. Result Viewing**

**Views:**
- [ ] Admin: View all student results
- [ ] Teacher: View class results
- [ ] Parent: View own children's results
- [ ] Download PDF
- [ ] Print result sheet

**Priority**: 🟡 **HIGH**

**Estimated**: 2-3 hours with TDD

---

## Data Model Relationships

```
Tenant (School)
├── Classes (many)
│   ├── Students (many) → currentClassId
│   ├── ClassTeacher (one) → Class.teacherId
│   └── Scores (many) → Score.classId
├── Subjects (many)
│   └── Scores (many) → Score.subjectId
├── Teachers/Users (many)
│   ├── AssignedClasses (many-to-many)
│   ├── AssignedSubjects (many-to-many)
│   └── EnteredScores (many) → Score.teacherId
├── Students (many)
│   ├── Guardians (many-to-many)
│   ├── Scores (many) → Score.studentId
│   └── Results (many) → Result.studentId
├── Terms (many)
│   └── Scores (many) → Score.termId
└── Scores (many)
    ├── Student (one)
    ├── Subject (one)
    ├── Class (one)
    ├── Term (one)
    └── Teacher (one)
```

---

## Firestore Collections Structure

```
firestore/
├── tenants/
├── users/ (teachers, admins, parents)
├── students/
├── classes/
├── subjects/
├── terms/
├── scores/
├── results/
├── guardians/
├── classTeacherAssignments/ (optional - can be in Class)
└── subjectTeacherAssignments/ (optional)
```

---

## Implementation Strategy

### **Option 1: Sequential (Recommended for TDD)**
Build in order of dependency:
1. Classes → Subjects → Terms → Teachers (Foundation)
2. Complete Students CRUD
3. Assignments (Class-Teacher, Subject-Teacher)
4. Score Entry (CA, Exam, Project)
5. Results Generation

**Pros**:
- Clean dependencies
- Test each layer fully
- Less refactoring

**Cons**:
- Takes longer to see end-to-end flow

---

### **Option 2: Vertical Slices**
Build one complete flow at a time:
1. Classes (full CRUD) with tests
2. Subjects (full CRUD) with tests
3. Students (full CRUD) with tests
4. Teachers (full CRUD) with tests
5. Score Entry (complete feature) with tests
6. Results (complete feature) with tests

**Pros**:
- See working features quickly
- Demo-ready after each slice

**Cons**:
- May need to revisit earlier features

---

## Recommended Next Steps

### **Immediate (Phase 8A):**

1. **Classes CRUD** (2-3 hours)
   - Write tests for list/add/edit/delete
   - Implement class management
   - All tests passing

2. **Subjects CRUD** (1-2 hours)
   - Write tests
   - Implement subject management
   - All tests passing

3. **Terms CRUD** (1-2 hours)
   - Write tests
   - Implement term management
   - Mark current term
   - All tests passing

4. **Teachers Management** (3-4 hours)
   - Write tests
   - Create User accounts for teachers
   - Implement teacher CRUD
   - All tests passing

### **After Foundation (Phase 8B):**

5. **Complete Students** (4-5 hours)
   - Add student form
   - Edit student
   - Delete student
   - Student detail page

### **Then Score Entry (Phase 9):**

6. **Score Entry System** (8-10 hours)
   - CA entry interface
   - Exam entry
   - Auto-calculations
   - Publishing

### **Finally Results (Phase 10):**

7. **Results Generation** (6-8 hours)
   - Consolidate scores
   - Rankings
   - PDF generation
   - Parent viewing

---

## Time Estimates (With TDD)

| Phase | Feature | Estimated Time |
|-------|---------|----------------|
| 8A | Classes CRUD | 2-3 hours |
| 8A | Subjects CRUD | 1-2 hours |
| 8A | Terms CRUD | 1-2 hours |
| 8A | Teachers CRUD | 3-4 hours |
| **8A Total** | **Foundation** | **7-11 hours** |
| 8B | Complete Students | 4-5 hours |
| 8C | Assignments & Guardians | 4-6 hours |
| **8B+8C Total** | **Relationships** | **8-11 hours** |
| 9 | Score Entry (CA/Exam/Project) | 8-10 hours |
| 10 | Results & Reports | 7-9 hours |
| **Grand Total** | **Full System** | **30-41 hours** |

---

## Answer to Your Question

### ✅ **Confirmed**: CRUD operations are **PLANNED** but **NOT YET IMPLEMENTED** for:

1. ❌ Classes - *Not built*
2. ❌ Subjects - *Not built*
3. ❌ Teachers - *Not built*
4. ❌ Assessments (CA1, CA2, CA3) - *Not built (part of Score entry)*
5. ❌ Exams - *Not built (part of Score entry)*
6. ❌ Projects - *Not built (part of Score entry)*
7. ❌ Class-Teacher Assignments - *Not built*
8. ❌ Subject-Teacher Assignments - *Not built*
9. ❌ Terms - *Not built*
10. ❌ Guardians - *Not built*

### ✅ **Data Model**: All TypeScript interfaces exist in `types/index.ts`

### ✅ **Current Progress**:
- Students: List view only (25% complete)
- Everything else: 0% complete

---

## Recommendation

**Build in this order:**

```
1. Classes CRUD       (CRITICAL - students need classes)
2. Subjects CRUD      (CRITICAL - scores need subjects)
3. Terms CRUD         (CRITICAL - scores need terms)
4. Teachers CRUD      (HIGH - needed for assignments)
5. Complete Students  (HIGH - need full CRUD)
6. Assignments        (MEDIUM - optional for MVP)
7. Score Entry        (CRITICAL - core feature)
8. Results            (CRITICAL - core feature)
9. Guardians          (LOW - can be added later)
```

**Would you like me to start with Classes CRUD next?** This is the foundation entity that students need to reference.
