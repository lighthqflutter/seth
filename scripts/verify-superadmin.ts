import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();

async function verifySuperAdmin(email: string) {
  try {
    console.log(`\nVerifying super admin: ${email}`);

    // Get user by email
    const user = await auth.getUserByEmail(email);
    console.log('\n✅ User found:');
    console.log(`  UID: ${user.uid}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName || 'N/A'}`);

    // Get custom claims
    const userRecord = await auth.getUser(user.uid);
    console.log('\n📋 Custom Claims:');
    console.log(JSON.stringify(userRecord.customClaims, null, 2));

    // Check if role is superadmin
    if (userRecord.customClaims?.role === 'superadmin') {
      console.log('\n✅ User has superadmin role!');
    } else {
      console.log('\n⚠️  User does NOT have superadmin role.');
      console.log('Setting superadmin role now...\n');

      // Set custom claims
      await auth.setCustomUserClaims(user.uid, {
        role: 'superadmin',
        tenantId: null,
      });

      console.log('✅ Superadmin role set successfully!');
      console.log('⚠️  User needs to log out and log back in for changes to take effect.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Get email from command line or use default
const email = process.argv[2] || process.env.SUPER_ADMIN_EMAIL || 'support@lighthousemultimedia.net';

verifySuperAdmin(email)
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
