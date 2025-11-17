/**
 * Create Super Admin Account
 *
 * Usage: npx tsx scripts/create-super-admin.ts
 *
 * Creates a super admin user with:
 * - Email: support@lighthousemultimedia.net
 * - Password: (set via environment variable or prompt)
 * - Role: superadmin
 * - TenantId: SUPER_ADMIN
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('📁 Loading environment from .env.local...');
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️  Warning: .env.local not found, using system environment variables');
}

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccount) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
    console.error('Set it in .env.local file');
    process.exit(1);
  }

  try {
    const serviceAccountObj = JSON.parse(serviceAccount);
    initializeApp({
      credential: cert(serviceAccountObj),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
}

const auth = getAuth();
const db = getFirestore();

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'support@lighthousemultimedia.net';
const SUPER_ADMIN_NAME = 'Super Administrator';
const SUPER_ADMIN_TENANT_ID = 'SUPER_ADMIN';

async function promptForPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter password for super admin (min 6 chars): ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function createSuperAdmin() {
  console.log('\n🔧 Creating Super Admin Account...\n');

  try {
    // Get password
    let password = process.env.SUPER_ADMIN_PASSWORD;
    if (!password) {
      password = await promptForPassword();
    }

    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
      console.log('✅ Firebase Auth user already exists:', userRecord.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create Firebase Auth user
        console.log('Creating Firebase Auth user...');
        userRecord = await auth.createUser({
          email: SUPER_ADMIN_EMAIL,
          password: password,
          displayName: SUPER_ADMIN_NAME,
          emailVerified: true,
        });
        console.log('✅ Firebase Auth user created:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Check if Firestore user document exists
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      // Update existing user to super admin
      console.log('Updating existing user to super admin...');
      await userDocRef.update({
        role: 'superadmin',
        tenantId: SUPER_ADMIN_TENANT_ID,
        updatedAt: Timestamp.now(),
      });
      console.log('✅ User updated to super admin');
    } else {
      // Create new Firestore user document
      console.log('Creating Firestore user document...');
      await userDocRef.set({
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        role: 'superadmin',
        tenantId: SUPER_ADMIN_TENANT_ID,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Firestore user document created');
    }

    // Set custom claims for super admin
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'superadmin',
      tenantId: SUPER_ADMIN_TENANT_ID,
    });
    console.log('✅ Custom claims set');

    console.log('\n✅ Super Admin Account Ready!\n');
    console.log('Email:', SUPER_ADMIN_EMAIL);
    console.log('Password:', '********');
    console.log('Role: superadmin');
    console.log('Tenant ID:', SUPER_ADMIN_TENANT_ID);
    console.log('\nYou can now login at /login\n');

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
