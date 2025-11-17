import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Delete School API Endpoint (Super Admin Only)
 *
 * Permanently deletes a school and ALL associated data:
 * - Tenant document
 * - All users (admins, teachers, parents)
 * - All students
 * - All classes
 * - All subjects
 * - All scores
 * - All attendance records
 * - All terms
 * - All audit logs
 * - All guardians
 * - All fees data
 * - Report card templates
 * - Skills data
 *
 * This operation is IRREVERSIBLE.
 */

interface DeleteSchoolRequest {
  tenantId: string;
  confirmationText: string; // User must type the school name to confirm
  schoolName: string; // For verification
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteSchoolRequest = await request.json();
    const { tenantId, confirmationText, schoolName } = body;

    // Validate required fields
    if (!tenantId || !confirmationText || !schoolName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get requesting user from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and check if user is super admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    if (decodedToken.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      );
    }

    // Verify the school exists
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const tenantData = tenantDoc.data();

    // Verify confirmation text matches school name (case-insensitive)
    if (confirmationText.toLowerCase().trim() !== schoolName.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Confirmation text does not match school name' },
        { status: 400 }
      );
    }

    console.log(`Starting deletion of school: ${schoolName} (${tenantId})`);

    // Count documents before deletion for logging
    const counts = {
      users: 0,
      students: 0,
      classes: 0,
      subjects: 0,
      scores: 0,
      attendance: 0,
      terms: 0,
      auditLogs: 0,
      fees: 0,
      templates: 0,
      skills: 0,
    };

    // Collections to delete
    const collections = [
      'users',
      'students',
      'classes',
      'subjects',
      'scores',
      'attendance',
      'terms',
      'auditLogs',
      'fees',
      'feeStructures',
      'feeAssignments',
      'payments',
      'reportCardTemplates',
      'skills',
      'guardians',
    ];

    // Delete all documents in each collection for this tenant
    for (const collectionName of collections) {
      const snapshot = await adminDb
        .collection(collectionName)
        .where('tenantId', '==', tenantId)
        .get();

      counts[collectionName as keyof typeof counts] = snapshot.size;

      console.log(`Deleting ${snapshot.size} documents from ${collectionName}`);

      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      let batch = adminDb.batch();
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        batchCount++;

        if (batchCount === batchSize) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        await batch.commit();
      }
    }

    // Delete all Firebase Auth users for this tenant
    console.log('Deleting Firebase Auth users...');
    const usersSnapshot = await adminDb
      .collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    let deletedAuthUsers = 0;
    for (const userDoc of usersSnapshot.docs) {
      try {
        await adminAuth.deleteUser(userDoc.id);
        deletedAuthUsers++;
      } catch (error: any) {
        // User might not exist in Auth (if created incorrectly)
        console.warn(`Failed to delete auth user ${userDoc.id}:`, error.message);
      }
    }

    console.log(`Deleted ${deletedAuthUsers} Firebase Auth users`);

    // Delete the tenant document itself
    await adminDb.collection('tenants').doc(tenantId).delete();

    console.log(`School deletion completed: ${schoolName} (${tenantId})`);

    return NextResponse.json({
      success: true,
      message: `School "${schoolName}" and all associated data permanently deleted`,
      deletedCounts: {
        ...counts,
        authUsers: deletedAuthUsers,
        tenant: 1,
      },
    });
  } catch (error: any) {
    console.error('Error deleting school:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete school' },
      { status: 500 }
    );
  }
}
