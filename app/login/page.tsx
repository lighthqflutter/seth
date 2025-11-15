'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logAudit } from '@/lib/auditLogger';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Get custom claims
      const idTokenResult = await userCredential.user.getIdTokenResult();
      const role = idTokenResult.claims.role as 'admin' | 'teacher' | 'parent';
      const tenantId = idTokenResult.claims.tenantId as string;

      console.log('Logged in successfully:', { role, tenantId });

      // Audit log: Successful login
      await logAudit({
        user: {
          uid: userCredential.user.uid,
          name: userCredential.user.displayName || email,
          email: userCredential.user.email || email,
          role: role,
          tenantId: tenantId,
        },
        action: 'login',
        entityType: 'user',
        entityId: userCredential.user.uid,
        metadata: {
          ipAddress: 'unknown', // Would need server-side to get real IP
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
          timestamp: new Date().toISOString(),
        },
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);

      // Audit log: Failed login (use email as identifier)
      try {
        // Try to log failed login (best effort)
        await logAudit({
          user: {
            uid: 'unknown',
            name: email,
            email: email,
            role: 'admin', // Unknown role for failed login
            tenantId: 'unknown',
          },
          action: 'failed_login',
          entityType: 'user',
          entityId: email,
          success: false,
          errorMessage: err.code || err.message || 'Login failed',
          metadata: {
            errorCode: err.code,
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      } catch (auditError) {
        // Silently fail audit logging to not block login flow
        console.error('Failed to log audit:', auditError);
      }

      // User-friendly error messages
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">SchoolPortal</h1>
          </Link>
          <p className="text-gray-600">Sign in to your school account</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <Input
                type="email"
                label="Email Address"
                placeholder="admin@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              {/* Password Input */}
              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              {/* Demo Credentials (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Demo Credentials:</p>
                  <p className="text-xs text-gray-600">Email: admin@demo.com</p>
                  <p className="text-xs text-gray-600">Password: demo123</p>
                  <p className="text-xs text-gray-500 mt-2">
                    (Create account in Firebase Emulator first)
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have a school account?{' '}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Register your school
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
