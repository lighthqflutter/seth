/**
 * Audit Logger Integration Examples
 * Phase 13: How to integrate audit logging into CRUD operations
 *
 * This file shows examples of how to use the audit logger
 * in your application code. Copy and adapt these patterns
 * to your own CRUD operations.
 */

import { logAudit } from './auditLogger';
import { Student } from '@/types';

interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent';
  tenantId: string;
}

// ===========================================
// EXAMPLE 1: CREATE Operation
// ===========================================

export async function createStudentWithAudit(
  student: Partial<Student>,
  user: User
) {
  try {
    // Your existing create logic here
    // const newStudent = await createStudent(student);

    const newStudent = { id: 'student-123', ...student } as Student;

    // Log successful create
    await logAudit({
      user,
      action: 'create',
      entityType: 'student',
      entityId: newStudent.id,
      entityName: `${newStudent.firstName} ${newStudent.lastName}`,
      after: {
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        admissionNumber: newStudent.admissionNumber,
      },
      metadata: {
        classId: newStudent.currentClassId,
      },
    });

    return newStudent;
  } catch (error: any) {
    // Log failed create
    await logAudit({
      user,
      action: 'create',
      entityType: 'student',
      entityId: 'unknown',
      success: false,
      errorMessage: error.message || 'Failed to create student',
    });

    throw error;
  }
}

// ===========================================
// EXAMPLE 2: UPDATE Operation
// ===========================================

export async function updateStudentWithAudit(
  studentId: string,
  updates: Partial<Student>,
  user: User
) {
  try {
    // Get the current state BEFORE update
    // const existingStudent = await getStudent(studentId);
    const existingStudent = {
      id: studentId,
      firstName: 'John',
      lastName: 'Doe',
      currentClassId: 'class-1',
    } as Student;

    // Your existing update logic here
    // const updatedStudent = await updateStudent(studentId, updates);
    const updatedStudent = { ...existingStudent, ...updates };

    // Log successful update with before/after
    await logAudit({
      user,
      action: 'update',
      entityType: 'student',
      entityId: studentId,
      entityName: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
      before: {
        firstName: existingStudent.firstName,
        lastName: existingStudent.lastName,
        currentClassId: existingStudent.currentClassId,
      },
      after: {
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        currentClassId: updatedStudent.currentClassId,
      },
      metadata: {
        fieldsChanged: Object.keys(updates),
      },
    });

    return updatedStudent;
  } catch (error: any) {
    // Log failed update
    await logAudit({
      user,
      action: 'update',
      entityType: 'student',
      entityId: studentId,
      success: false,
      errorMessage: error.message || 'Failed to update student',
    });

    throw error;
  }
}

// ===========================================
// EXAMPLE 3: DELETE Operation
// ===========================================

export async function deleteStudentWithAudit(
  studentId: string,
  user: User
) {
  try {
    // Get the current state BEFORE delete
    // const student = await getStudent(studentId);
    const student = {
      id: studentId,
      firstName: 'John',
      lastName: 'Doe',
      admissionNumber: 'ADM001',
    } as Student;

    // Your existing delete logic here
    // await deleteStudent(studentId);

    // Log successful delete
    await logAudit({
      user,
      action: 'delete',
      entityType: 'student',
      entityId: studentId,
      entityName: `${student.firstName} ${student.lastName}`,
      before: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
      },
      metadata: {
        deletedBy: user.uid,
      },
    });

    return true;
  } catch (error: any) {
    // Log failed delete
    await logAudit({
      user,
      action: 'delete',
      entityType: 'student',
      entityId: studentId,
      success: false,
      errorMessage: error.message || 'Failed to delete student',
    });

    throw error;
  }
}

// ===========================================
// EXAMPLE 4: AUTHENTICATION Events
// ===========================================

export async function logLoginAttempt(
  user: User,
  success: boolean,
  errorMessage?: string
) {
  await logAudit({
    user,
    action: success ? 'login' : 'failed_login',
    entityType: 'user',
    entityId: user.uid,
    success,
    errorMessage,
    metadata: {
      ipAddress: '192.168.1.1', // Get from request in real app
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    },
  });
}

// ===========================================
// EXAMPLE 5: BULK Operations
// ===========================================

export async function publishScoresWithAudit(
  classId: string,
  subjectId: string,
  termId: string,
  studentCount: number,
  user: User
) {
  try {
    // Your existing publish logic here
    // await publishScores(classId, subjectId, termId);

    // Log successful publish
    await logAudit({
      user,
      action: 'publish_scores',
      entityType: 'score',
      entityId: 'bulk',
      metadata: {
        classId,
        subjectId,
        termId,
        studentCount,
        publishedAt: new Date().toISOString(),
      },
    });

    return true;
  } catch (error: any) {
    // Log failed publish
    await logAudit({
      user,
      action: 'publish_scores',
      entityType: 'score',
      entityId: 'bulk',
      success: false,
      errorMessage: error.message || 'Failed to publish scores',
      metadata: {
        classId,
        subjectId,
        termId,
      },
    });

    throw error;
  }
}

// ===========================================
// EXAMPLE 6: EXPORT/DOWNLOAD Operations
// ===========================================

export async function downloadResultPDFWithAudit(
  studentId: string,
  termId: string,
  user: User
) {
  try {
    // Your existing PDF generation logic here
    // const pdfUrl = await generatePDF(studentId, termId);

    // Log successful download
    await logAudit({
      user,
      action: 'download_pdf',
      entityType: 'result',
      entityId: `${studentId}-${termId}`,
      metadata: {
        studentId,
        termId,
        downloadedAt: new Date().toISOString(),
      },
    });

    return 'https://example.com/result.pdf';
  } catch (error: any) {
    // Log failed download
    await logAudit({
      user,
      action: 'download_pdf',
      entityType: 'result',
      entityId: `${studentId}-${termId}`,
      success: false,
      errorMessage: error.message || 'Failed to generate PDF',
    });

    throw error;
  }
}

// ===========================================
// EXAMPLE 7: VIEW/READ Operations (Optional)
// ===========================================

export async function viewStudentWithAudit(
  studentId: string,
  user: User
) {
  try {
    // Your existing get logic here
    // const student = await getStudent(studentId);

    // Log view (only if you want to track read operations)
    await logAudit({
      user,
      action: 'view',
      entityType: 'student',
      entityId: studentId,
      metadata: {
        viewedAt: new Date().toISOString(),
      },
    });

    return { id: studentId } as Student;
  } catch (error: any) {
    // Log failed view
    await logAudit({
      user,
      action: 'view',
      entityType: 'student',
      entityId: studentId,
      success: false,
      errorMessage: error.message || 'Failed to view student',
    });

    throw error;
  }
}

// ===========================================
// INTEGRATION CHECKLIST
// ===========================================
/*

To integrate audit logging into your CRUD operations:

1. ✅ Import the logAudit function
   import { logAudit } from '@/lib/auditLogger';

2. ✅ Wrap your operations in try-catch blocks

3. ✅ For CREATE operations:
   - Log AFTER successful creation with 'after' data
   - Include entity name and metadata

4. ✅ For UPDATE operations:
   - Get existing state BEFORE update
   - Log with both 'before' and 'after' data
   - Include changed fields in metadata

5. ✅ For DELETE operations:
   - Get existing state BEFORE delete
   - Log with 'before' data
   - Include deletion context in metadata

6. ✅ For AUTHENTICATION:
   - Log both successful and failed attempts
   - Include IP address and user agent
   - Use 'login' or 'failed_login' action

7. ✅ For BULK operations:
   - Log with entityId: 'bulk'
   - Include count and affected IDs in metadata

8. ✅ For ERROR scenarios:
   - Always log failures with success: false
   - Include error message
   - Provide context in metadata

9. ✅ For READ operations (OPTIONAL):
   - Only log if you need compliance tracking
   - Use 'view' action
   - Keep metadata minimal

10. ✅ Consider privacy:
    - Don't log sensitive data (passwords, credit cards)
    - Only log necessary fields
    - Follow GDPR/compliance requirements

*/

// ===========================================
// NOTES ON BEST PRACTICES
// ===========================================
/*

1. **Performance**: Audit logging is async and non-blocking.
   Don't await it if you don't need to.

2. **Errors**: If audit logging fails, it shouldn't break your app.
   Consider wrapping logAudit in try-catch.

3. **Metadata**: Use metadata for contextual information that
   doesn't fit in before/after (IP, user agent, etc.)

4. **Entity Names**: Always provide friendly names for better
   readability in audit logs (e.g., "John Doe" not just "user-123")

5. **Bulk Operations**: For operations affecting multiple entities,
   use entityId: 'bulk' and list affected IDs in metadata.

6. **Privacy**: Be mindful of sensitive data. Only log what's
   necessary for auditing purposes.

7. **Retention**: Plan for log retention policies. Audit logs
   can grow large over time.

*/
