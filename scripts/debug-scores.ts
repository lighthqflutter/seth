/**
 * Debug script to check scores data in Firestore
 * Run with: npx tsx scripts/debug-scores.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔧 Using Firebase Project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugScores() {
  console.log('🔍 Debugging Scores Data...\n');

  try {
    // 1. Check if any scores exist
    console.log('1️⃣ Checking all scores in the collection...');
    const allScoresQuery = query(collection(db, 'scores'), limit(10));
    const allScoresSnap = await getDocs(allScoresQuery);

    console.log(`   Found ${allScoresSnap.size} scores (showing first 10)`);

    if (allScoresSnap.size === 0) {
      console.log('   ❌ NO SCORES FOUND IN DATABASE!');
      console.log('   Make sure you have entered and published scores.');
      return;
    }

    console.log('\n📋 Sample scores data:');
    allScoresSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n   Score ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - Student ID: ${data.studentId}`);
      console.log(`   - Class ID: ${data.classId}`);
      console.log(`   - Term ID: ${data.termId}`);
      console.log(`   - Subject ID: ${data.subjectId}`);
      console.log(`   - Total: ${data.total}`);
      console.log(`   - Grade: ${data.grade}`);
      console.log(`   - isPublished: ${data.isPublished}`);
      console.log(`   - isDraft: ${data.isDraft}`);
      console.log(`   - Tenant ID: ${data.tenantId}`);
    });

    // 2. Check published scores
    console.log('\n\n2️⃣ Checking PUBLISHED scores only...');
    const publishedQuery = query(
      collection(db, 'scores'),
      where('isPublished', '==', true),
      limit(10)
    );
    const publishedSnap = await getDocs(publishedQuery);
    console.log(`   Found ${publishedSnap.size} published scores`);

    if (publishedSnap.size === 0) {
      console.log('   ⚠️  NO PUBLISHED SCORES FOUND!');
      console.log('   All scores are drafts. You need to click "Publish Scores" button.');
    }

    // 3. Check draft scores
    console.log('\n\n3️⃣ Checking DRAFT scores...');
    const draftQuery = query(
      collection(db, 'scores'),
      where('isDraft', '==', true),
      limit(10)
    );
    const draftSnap = await getDocs(draftQuery);
    console.log(`   Found ${draftSnap.size} draft scores`);

    // 4. Group by tenant
    console.log('\n\n4️⃣ Grouping scores by tenant...');
    const tenantMap = new Map<string, number>();
    allScoresSnap.docs.forEach(doc => {
      const tenantId = doc.data().tenantId;
      tenantMap.set(tenantId, (tenantMap.get(tenantId) || 0) + 1);
    });

    console.log('   Scores per tenant:');
    tenantMap.forEach((count, tenantId) => {
      console.log(`   - ${tenantId}: ${count} scores`);
    });

    // 5. Group by class
    console.log('\n\n5️⃣ Grouping scores by class...');
    const classMap = new Map<string, number>();
    allScoresSnap.docs.forEach(doc => {
      const classId = doc.data().classId;
      classMap.set(classId, (classMap.get(classId) || 0) + 1);
    });

    console.log('   Scores per class:');
    classMap.forEach((count, classId) => {
      console.log(`   - ${classId}: ${count} scores`);
    });

    // 6. Group by term
    console.log('\n\n6️⃣ Grouping scores by term...');
    const termMap = new Map<string, number>();
    allScoresSnap.docs.forEach(doc => {
      const termId = doc.data().termId;
      termMap.set(termId, (termMap.get(termId) || 0) + 1);
    });

    console.log('   Scores per term:');
    termMap.forEach((count, termId) => {
      console.log(`   - ${termId}: ${count} scores`);
    });

    console.log('\n\n✅ Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Make sure scores have isPublished: true');
    console.log('   2. Verify tenantId, classId, and termId match what you\'re querying');
    console.log('   3. Check that students exist in the class');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

debugScores();
