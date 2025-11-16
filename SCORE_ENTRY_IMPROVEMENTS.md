# Score Entry System - Duplicate Prevention & Edit Support

## Problem Statement

**Issue 1**: Students could accidentally enter scores for the wrong term (inactive term) leading to data mismatch.

**Issue 2**: Every time scores were saved, new documents were created instead of updating existing ones, causing duplicates.

**Issue 3**: No way to edit previously entered scores - had to delete and re-enter.

---

## Solutions Implemented

### 1. Prevent Wrong Term Selection (`/app/dashboard/scores/page.tsx`)

**Changes Made**:

- **Auto-select current term** (lines 93-97): Automatically selects the active term when page loads
  ```typescript
  const currentTerm = termsData.find(t => t.isCurrent);
  if (currentTerm) {
    setSelectedTerm(currentTerm.id);
  }
  ```

- **Show term status** (line 246): Display "(Current)" label next to active term
  ```typescript
  {term.name} {term.isCurrent ? '(Current)' : ''} - {term.academicYear}
  ```

- **Warning banner** (lines 250-257): Yellow warning when selecting non-current term
  ```jsx
  {selectedTerm && !terms.find(t => t.id === selectedTerm)?.isCurrent && (
    <div className="bg-yellow-50 border border-yellow-200">
      ⚠️ Warning: You are entering scores for a non-current term.
    </div>
  )}
  ```

**Benefits**:
- Users can't accidentally select wrong term
- Clear visual feedback about which term is active
- Still allows intentional selection of past terms

---

### 2. Load Existing Scores for Editing (`/app/dashboard/scores/entry/page.tsx`)

**Changes Made**:

- **Query existing scores** (lines 162-180): Load scores for selected class, subject, and term
  ```typescript
  const existingScoresQuery = query(
    collection(db, 'scores'),
    where('tenantId', '==', user.tenantId),
    where('classId', '==', classId),
    where('subjectId', '==', subjectId),
    where('termId', '==', termId)
  );
  ```

- **Store document IDs** (line 177): Keep track of Firestore document IDs for updates
  ```typescript
  existingScoresMap.set(data.studentId, {
    scoreId: doc.id, // Store for updates
    ...data,
  });
  ```

- **Pre-populate form** (lines 184-205): Fill in existing scores or start empty
  ```typescript
  if (existingScore) {
    scoresMap.set(student.id, {
      assessmentScores: existingScore.assessmentScores || {},
      scoreId: existingScore.scoreId, // For updates
    });
  } else {
    // Initialize empty
  }
  ```

**Benefits**:
- Existing scores are loaded automatically
- No risk of duplicate entries
- Can edit and update previously entered scores

---

### 3. Update Instead of Create (`/app/dashboard/scores/entry/page.tsx`)

**Changes Made**:

- **Check for existing score** (lines 508-518): Use `updateDoc` if score exists, `addDoc` if new
  ```typescript
  if (studentScore.scoreId) {
    // Update existing score
    const scoreRef = doc(db, 'scores', studentScore.scoreId);
    await updateDoc(scoreRef, scoreData);
  } else {
    // Create new score
    await addDoc(scoresCollection, {
      ...scoreData,
      createdAt: Timestamp.now(),
    });
  }
  ```

**Benefits**:
- **No duplicates**: Same score document is updated
- **Preserves history**: `createdAt` stays original, `updatedAt` changes
- **Atomic updates**: Single document per student/subject/term

---

### 4. Visual Feedback for Editing (`/app/dashboard/scores/entry/page.tsx`)

**Changes Made**:

- **Info banner** (lines 611-628): Blue banner showing how many existing scores are loaded
  ```jsx
  {existingScoresCount > 0 && (
    <div className="bg-blue-50 border border-blue-200">
      <h3>Editing Existing Scores</h3>
      <p>
        {existingScoresCount} student{existingScoresCount > 1 ? 's have' : ' has'}
        previously entered scores. You can edit them and click "Publish Scores" to update.
      </p>
    </div>
  )}
  ```

**Benefits**:
- Clear indication that you're editing, not creating new
- Shows how many students have existing scores
- Reduces confusion

---

### 5. Dynamic Student Count (`/app/dashboard/results/page.tsx`)

**Changes Made**:

- **Real-time count** (lines 58-77): Query students collection instead of using cached field
  ```typescript
  const classesData = await Promise.all(
    classesSnapshot.docs.map(async (doc) => {
      const studentsQuery = query(
        collection(db, 'students'),
        where('currentClassId', '==', doc.id),
        where('isActive', '==', true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      return {
        ...classData,
        studentCount: studentsSnapshot.size, // Real-time count
      };
    })
  );
  ```

**Benefits**:
- Always shows accurate student count
- No need to manually update class documents
- Reflects real-time data

---

## Technical Details

### Firestore Query Strategy

**Before**:
```typescript
// Always created new documents
await addDoc(collection(db, 'scores'), scoreData);
```

**After**:
```typescript
// Load existing first
const existing = await getDocs(query(
  collection(db, 'scores'),
  where('classId', '==', classId),
  where('subjectId', '==', subjectId),
  where('termId', '==', termId)
));

// Then update or create
if (existingScoreId) {
  await updateDoc(doc(db, 'scores', existingScoreId), data);
} else {
  await addDoc(collection(db, 'scores'), data);
}
```

### Data Flow

1. **User selects** class, subject, term → Navigate to entry page
2. **Page loads** students + existing scores for that combination
3. **Form pre-populates** with existing data (if any)
4. **User edits** scores
5. **On save**:
   - If `scoreId` exists → `updateDoc()`
   - If no `scoreId` → `addDoc()` + set `createdAt`

### Index Requirements

These queries require composite indexes (already deployed):

```json
{
  "collectionGroup": "scores",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "classId", "order": "ASCENDING" },
    { "fieldPath": "subjectId", "order": "ASCENDING" }
  ]
}
```

---

## Testing Checklist

- [x] **New scores**: Create scores for first time → should create new documents
- [x] **Edit scores**: Return to same class/subject/term → should load existing scores
- [x] **Update scores**: Modify and publish → should update same documents (no duplicates)
- [x] **Wrong term warning**: Select inactive term → should show yellow warning
- [x] **Current term auto-select**: Page load → should auto-select current term
- [x] **Info banner**: Load existing scores → should show blue info banner with count
- [x] **Student count**: Results page → should show accurate real-time count

---

## Migration Notes

### Existing Data

If you have duplicate score documents from before this fix:

1. **Identify duplicates**:
   ```typescript
   // Same studentId + classId + subjectId + termId
   ```

2. **Keep the latest** (highest `updatedAt` or `createdAt`)

3. **Delete older duplicates** via Firebase Console or migration script

### Future Improvements

- [ ] Add "View History" button to see all versions of a score
- [ ] Add confirmation dialog when updating published scores
- [ ] Track edit history with timestamps and user info
- [ ] Add batch edit capability for multiple subjects at once
- [ ] Show last modified info on score entry page

---

## Files Modified

1. `/app/dashboard/scores/page.tsx` - Term selection improvements
2. `/app/dashboard/scores/entry/page.tsx` - Load existing scores, update logic, UI banners
3. `/app/dashboard/results/page.tsx` - Dynamic student counting

## Build Status

✅ All changes compiled successfully
✅ No TypeScript errors
✅ Ready for deployment
