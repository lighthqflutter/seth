'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface AuthUser extends FirebaseUser {
  tenantId?: string;
  role?: 'admin' | 'teacher' | 'parent';
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get custom claims (role and tenantId)
        const idTokenResult = await firebaseUser.getIdTokenResult();
        setUser({
          ...firebaseUser,
          tenantId: idTokenResult.claims.tenantId as string,
          role: idTokenResult.claims.role as 'admin' | 'teacher' | 'parent',
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
