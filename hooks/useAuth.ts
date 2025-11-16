'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface AuthUser extends FirebaseUser {
  tenantId: string; // Required - from custom claims (SUPER_ADMIN for super admin users)
  role: 'superadmin' | 'admin' | 'teacher' | 'parent'; // Required - from custom claims
  name: string; // Computed from displayName or email (always has fallback)
  email: string; // Overriding to make non-nullable (always available for logged in users)
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get custom claims (role and tenantId)
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const email = firebaseUser.email || 'no-email@unknown.com';
        const tenantId = idTokenResult.claims.tenantId as string || 'unknown';
        const role = idTokenResult.claims.role as 'superadmin' | 'admin' | 'teacher' | 'parent' || 'admin';
        setUser({
          ...firebaseUser,
          email, // Override to ensure non-null
          tenantId,
          role,
          name: firebaseUser.displayName || email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
