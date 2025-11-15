import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

// Initialize Firebase Admin (server-side only)
if (getApps().length === 0) {
  // In development with emulator, we don't need service account
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    adminApp = initializeApp({
      projectId: 'school-portal-demo',
    });

    // Connect to emulators
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

    console.log('🔥 Firebase Admin connected to emulators');
  } else {
    // Production: Use service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null;

    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required in production');
    }

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
