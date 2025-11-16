/**
 * Migration Script: Fix Score Term IDs
 * Updates scores with incorrect termId to the current active term
 *
 * Run with: npx tsx scripts/fix-score-term-ids.ts
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
// Uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials
const app = initializeApp({
  projectId: 'seth-production-26d19',
});

const db = getFirestore(app);

// Configuration
const OLD_TERM_ID = '9X8MIpOvWyI5aubJcelc';
const NEW_TERM_ID = 'UCxe3pCOF2dssjCjlgtm';
const TENANT_ID = 'a8BaatD2SUP9rbXNSpcY';

async function fixScoreTermIds() {
  console.log('🔧 Starting Score Term ID Migration...\n');
  console.log(`   Project: ${app.options.projectId}`);
  console.log(`   Old Term ID: ${OLD_TERM_ID}`);
  console.log(`   New Term ID: ${NEW_TERM_ID}`);
  console.log(`   Tenant ID: ${TENANT_ID}\n`);

  try {
    // Query scores with old term ID
    const scoresRef = db.collection('scores');
    const snapshot = await scoresRef
      .where('tenantId', '==', TENANT_ID)
      .where('termId', '==', OLD_TERM_ID)
      .get();

    if (snapshot.empty) {
      console.log('✅ No scores found with old term ID. Nothing to update.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} scores to update\n`);

    // Update each score
    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   Updating score ${doc.id}:`);
      console.log(`   - Student: ${data.studentId}`);
      console.log(`   - Subject: ${data.subjectId}`);
      console.log(`   - Total: ${data.total}`);

      batch.update(doc.ref, { termId: NEW_TERM_ID });
      updateCount++;
    });

    // Commit the batch
    console.log(`\n🔄 Committing batch update for ${updateCount} scores...`);
    await batch.commit();

    console.log('\n✅ Migration Complete!');
    console.log(`   Updated ${updateCount} scores to new term ID`);
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the Results page in your browser');
    console.log('   2. Students should now appear with their scores');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run migration
fixScoreTermIds()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
