import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

// Initialize Firebase Admin (server-side only)
// Skip initialization during build time if credentials are not available
if (typeof window === 'undefined' && getApps().length === 0) {
  // In development with emulator, we don't need service account
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
    adminApp = initializeApp({
      projectId: 'school-portal-demo',
    });

    // Connect to emulators
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

    console.log('🔥 Firebase Admin connected to emulators');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Production: Use service account if available
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });

      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to parse Firebase service account key:', error);
      console.warn('⚠️ Firebase Admin not initialized due to JSON parsing error');
      // Don't throw - allow build to continue
    }
  } else {
    // Build time: Initialize with minimal config (will throw at runtime if used)
    console.warn('⚠️ Firebase Admin not initialized - service account key not provided');
  }
} else if (getApps().length > 0) {
  adminApp = getApps()[0];
}

export const adminAuth = adminApp ? getAuth(adminApp) : null as any;
export const adminDb = adminApp ? getFirestore(adminApp) : null as any;
