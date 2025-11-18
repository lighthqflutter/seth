import { adminDb, adminAuth } from '../lib/firebase/admin';

async function checkSchool() {
  try {
    console.log('Checking archwood1 school...\n');

    // Check if school exists
    const tenantsSnapshot = await adminDb.collection('tenants')
      .where('subdomain', '==', 'archwood1')
      .get();

    if (tenantsSnapshot.empty) {
      console.log('❌ School archwood1 NOT found in database');
      return;
    }

    const tenant = tenantsSnapshot.docs[0];
    console.log('✅ School found:');
    console.log('  ID:', tenant.id);
    console.log('  Name:', tenant.data().name);
    console.log('  Subdomain:', tenant.data().subdomain);
    console.log('  Email:', tenant.data().email);
    console.log('');

    // Check admin users
    const usersSnapshot = await adminDb.collection('users')
      .where('tenantId', '==', tenant.id)
      .where('role', '==', 'admin')
      .get();

    console.log(`✅ Found ${usersSnapshot.size} admin(s):`);

    for (const doc of usersSnapshot.docs) {
      console.log('  Name:', doc.data().name);
      console.log('  Email:', doc.data().email);
      console.log('  User ID:', doc.id);

      // Check Firebase Auth
      try {
        const authUser = await adminAuth.getUser(doc.id);
        console.log('  ✅ Firebase Auth account EXISTS');
        console.log('  Email verified:', authUser.emailVerified);
      } catch (err: any) {
        console.log('  ❌ Firebase Auth account NOT FOUND:', err.message);
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkSchool().then(() => process.exit(0));
