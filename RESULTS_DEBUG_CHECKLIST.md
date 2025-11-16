# Results Page Showing 0 Students - Debug Checklist

## Root Cause Analysis

The Results page requires **TWO conditions** to display students:

1. **Students must exist with `currentClassId` matching the class**
2. **Scores must exist with `isPublished: true` for those students**

## Issue Found

Based on code analysis at `/app/dashboard/results/class/[classId]/[termId]/page.tsx:108-113`, the Results page queries:

```typescript
const studentsQuery = query(
  collection(db, 'students'),
  where('tenantId', '==', user.tenantId),
  where('currentClassId', '==', classId),  // ← This must match!
  where('isActive', '==', true)
);
```

If **students don't have `currentClassId` set correctly**, they won't appear even if scores exist.

## How to Debug in Firebase Console

1. **Open Firebase Console**: https://console.firebase.google.com/project/seth-production-26d19/firestore

2. **Check Students Collection**:
   - Navigate to `students` collection
   - Find your 2 students who have scores
   - Check these fields for each:
     - ✅ `tenantId` matches your school
     - ✅ `isActive` is `true`
     - ✅ `currentClassId` matches the class ID you're viewing in Results

3. **Get the Class ID**:
   - The URL shows: `/dashboard/results/class/[classId]/[termId]`
   - Copy the `classId` from your browser URL
   - Example: If URL is `/dashboard/results/class/abc123/xyz456`, the classId is `abc123`

4. **Check Scores Collection**:
   - Navigate to `scores` collection
   - Filter where `isPublished == true`
   - Verify these fields:
     - ✅ `classId` matches the class you're viewing
     - ✅ `termId` matches the term you selected
     - ✅ `studentId` matches the student IDs
     - ✅ `tenantId` matches your school
     - ✅ `isPublished` is boolean `true` (not string "true")

## Most Likely Fixes

### Fix 1: Students Missing currentClassId
If students have `currentClassId` set to a different class or it's empty:

1. Go to Students page: https://www.seth.ng/dashboard/students
2. Edit each student
3. Make sure "Current Class" dropdown has the correct class selected
4. Save changes

### Fix 2: Scores Have Wrong Class ID
If you entered scores while viewing a different class:

1. The scores might have the wrong `classId`
2. You may need to delete and re-enter scores
3. Make sure you select the correct class on the Scores Entry page first

### Fix 3: Missing Firestore Index
The scores query requires a composite index. To check:

1. Try to view Results page again
2. Open browser DevTools → Console tab
3. Look for Firestore index error
4. If you see an error with a link, click it to auto-create the index

## Quick Test

To verify this is the issue:

1. Open Firebase Console → `students` collection
2. Find ONE student
3. Manually set `currentClassId` to the class ID from your Results page URL
4. Refresh Results page
5. If that student now appears → confirmed issue is `currentClassId` mismatch

## Files Involved

- `/app/dashboard/results/class/[classId]/[termId]/page.tsx:108-113` - Students query
- `/app/dashboard/results/class/[classId]/[termId]/page.tsx:123-129` - Scores query
- `/app/dashboard/scores/entry/page.tsx:455-457` - Where `isPublished` is set
- `/firestore.indexes.json:114-133` - Required indexes (may need deployment)
