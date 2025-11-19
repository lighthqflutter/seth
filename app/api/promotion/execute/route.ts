import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface ExecutePromotionRequest {
  campaignId: string;
  tenantId: string;
  userId: string;
  userName: string;
}

/**
 * Executes a promotion campaign by processing all approved promotion records
 * and updating student class assignments
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExecutePromotionRequest = await request.json();
    const { campaignId, tenantId, userId, userName } = body;

    // Validate required fields
    if (!campaignId || !tenantId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get campaign
    const campaignRef = adminDb.collection('promotion_campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();

    if (campaignData?.status === 'executed') {
      return NextResponse.json(
        { error: 'Campaign already executed' },
        { status: 400 }
      );
    }

    // Get all promotion records for this campaign with status 'submitted' or 'approved'
    const recordsSnapshot = await adminDb
      .collection('promotion_records')
      .where('campaignId', '==', campaignId)
      .where('status', 'in', ['submitted', 'approved'])
      .get();

    const records = recordsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No promotion records to process' },
        { status: 400 }
      );
    }

    // Create execution document
    const executionRef = await adminDb.collection('promotion_executions').add({
      campaignId,
      tenantId,
      status: 'processing',
      totalStudents: records.length,
      processedStudents: 0,
      successCount: 0,
      failedCount: 0,
      batchSize: 50,
      currentBatch: 0,
      totalBatches: Math.ceil(records.length / 50),
      results: {
        promoted: 0,
        repeated: 0,
        graduated: 0,
        failed: 0,
      },
      startedAt: Timestamp.now(),
      errors: [],
      executedBy: userId,
      executedByName: userName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update campaign status
    await campaignRef.update({
      status: 'executing',
      executionId: executionRef.id,
      updatedAt: Timestamp.now(),
    });

    // Process records in batches
    const batchSize = 50;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const results = {
      promoted: 0,
      repeated: 0,
      graduated: 0,
      failed: 0,
    };
    const errors: Array<{
      studentId: string;
      studentName: string;
      error: string;
      timestamp: any;
    }> = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const currentBatchNumber = Math.floor(i / batchSize) + 1;

      // Process each record in the batch
      for (const record of batch) {
        try {
          const studentRef = adminDb.collection('students').doc(record.studentId);
          const studentDoc = await studentRef.get();

          if (!studentDoc.exists) {
            throw new Error('Student not found');
          }

          // Update student based on decision
          const updateData: any = {
            updatedAt: Timestamp.now(),
          };

          if (record.decision === 'promote') {
            // Move to next class
            updateData.currentClassId = record.toClassId;
            updateData.currentClass = record.toClassName;
            updateData.previousClassId = record.fromClassId;
            updateData.previousClass = record.fromClassName;

            // Add to promotion history
            updateData.promotionHistory = FieldValue.arrayUnion({
              campaignId,
              fromClass: record.fromClassName,
              toClass: record.toClassName,
              academicYear: campaignData?.academicYear,
              promotedAt: Timestamp.now(),
            });

            results.promoted++;
          } else if (record.decision === 'repeat') {
            // Student stays in same class
            results.repeated++;
          } else if (record.decision === 'graduate') {
            // Mark as graduated
            updateData.status = 'graduated';
            updateData.isActive = false;
            updateData.graduatedAt = Timestamp.now();
            updateData.graduationYear = campaignData?.academicYear;
            updateData.graduationClass = record.fromClassName;
            updateData.finalAverage = record.averageScore;

            results.graduated++;
          }

          // Update student record
          await studentRef.update(updateData);

          // Update promotion record status
          await adminDb.collection('promotion_records').doc(record.id).update({
            status: 'executed',
            executedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          successCount++;
          processedCount++;
        } catch (error: any) {
          console.error(`Error processing student ${record.studentId}:`, error);
          failedCount++;
          processedCount++;
          results.failed++;

          errors.push({
            studentId: record.studentId,
            studentName: record.studentName,
            error: error.message || 'Unknown error',
            timestamp: Timestamp.now(),
          });
        }
      }

      // Update execution progress after each batch
      await executionRef.update({
        processedStudents: processedCount,
        successCount,
        failedCount,
        currentBatch: currentBatchNumber,
        results,
        errors,
        updatedAt: Timestamp.now(),
      });
    }

    // Mark execution as completed
    await executionRef.update({
      status: failedCount > 0 ? 'completed' : 'completed',
      completedAt: Timestamp.now(),
      processedStudents: processedCount,
      successCount,
      failedCount,
      results,
      errors,
      updatedAt: Timestamp.now(),
    });

    // Update campaign
    await campaignRef.update({
      status: 'executed',
      executedBy: userId,
      executedByName: userName,
      executedAt: Timestamp.now(),
      processedStudents: successCount,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      executionId: executionRef.id,
      totalStudents: records.length,
      processedStudents: processedCount,
      successCount,
      failedCount,
      results,
      message: `Promotion executed successfully. ${successCount} students processed, ${failedCount} failed.`,
    });
  } catch (error: any) {
    console.error('Promotion execution error:', error);

    return NextResponse.json(
      {
        error: 'Failed to execute promotion',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
