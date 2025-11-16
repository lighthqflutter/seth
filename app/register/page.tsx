'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is super admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Not logged in - redirect to login
        router.push('/login?redirect=/register');
      } else if (user.role !== 'superadmin') {
        // Logged in but not super admin - redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Step 1: School Information
  const [schoolName, setSchoolName] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  // Step 2: Admin Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Step 3: Subdomain & Quota
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [maxStudents, setMaxStudents] = useState(50); // Default quota

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!schoolName || !schoolEmail) {
      setError('Please fill in all required fields');
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminName || !adminEmail || !adminPassword || !adminConfirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setCurrentStep(3);
  };

  const checkSubdomainAvailability = async () => {
    if (!subdomain) return;

    // Convert to lowercase and remove spaces
    const cleanSubdomain = subdomain.toLowerCase().replace(/\s+/g, '');
    setSubdomain(cleanSubdomain);

    // Mock check (in real app, call API)
    // For now, just validate format
    const isValid = /^[a-z0-9-]+$/.test(cleanSubdomain);
    setSubdomainAvailable(isValid);
  };

  const handleStep3Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!subdomain) {
      setError('Please enter a subdomain');
      return;
    }

    if (!subdomainAvailable) {
      setError('Please choose a valid subdomain');
      return;
    }

    if (maxStudents < 1) {
      setError('Student quota must be at least 1');
      return;
    }

    handleCreateSchool();
  };

  const handleCreateSchool = async () => {
    setLoading(true);
    setError('');

    try {
      // Call API to create school
      const response = await fetch('/api/schools/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: {
            name: schoolName,
            email: schoolEmail,
            phone: schoolPhone,
            address: schoolAddress,
            maxStudents, // Set quota
          },
          admin: {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
          },
          subdomain,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create school');
      }

      const data = await response.json();
      console.log('School created:', data);

      // Go to success page
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show content if super admin
  if (!user || user.role !== 'superadmin') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
            🔒 Super Admin Only
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New School</h1>
          <p className="text-gray-600">Set up a new school portal with custom subdomain</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of 4
            </span>
            <span className="text-sm text-gray-600">{progressPercentage.toFixed(0)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step 1: School Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Tell us about the school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Next} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="School Name"
                  placeholder="Cedar International School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />

                <Input
                  type="email"
                  label="School Email"
                  placeholder="info@cedarschool.com"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  required
                />

                <Input
                  type="tel"
                  label="Phone Number"
                  placeholder="+234 xxx xxxx xxx"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                />

                <Input
                  label="Address"
                  placeholder="123 Education Street, Lagos"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                />

                <div className="flex gap-4">
                  <Link href="/dashboard" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1">
                    Next Step →
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Admin Account */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Create Admin Account</CardTitle>
              <CardDescription>
                Set up the school administrator account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2Next} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />

                <Input
                  type="email"
                  label="Email"
                  placeholder="admin@cedarschool.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />

                <Input
                  type="password"
                  label="Password"
                  placeholder="Minimum 6 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />

                <Input
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  required
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Next Step →
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Subdomain & Quota */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>School URL & Student Quota</CardTitle>
              <CardDescription>
                Choose subdomain and set student limit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep3Next} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <input
                        type="text"
                        placeholder="cedarschool"
                        value={subdomain}
                        onChange={(e) => {
                          setSubdomain(e.target.value);
                          setSubdomainAvailable(null);
                        }}
                        onBlur={checkSubdomainAvailability}
                        className="flex-1 px-4 py-2 focus:outline-none"
                        required
                      />
                      <span className="px-3 py-2 bg-gray-100 text-gray-600 text-sm border-l">
                        .seth.ng
                      </span>
                    </div>
                  </div>
                  {subdomainAvailable === true && (
                    <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                      ✓ Available
                    </p>
                  )}
                  {subdomainAvailable === false && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      ✗ Invalid subdomain (use lowercase letters, numbers, and hyphens only)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Quota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum number of students this school can onboard
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">School URL will be:</p>
                  <p className="text-lg font-semibold text-blue-600">
                    https://{subdomain || 'yourschool'}.seth.ng
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    Quota: <strong>{maxStudents}</strong> students
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                    disabled={loading}
                  >
                    ← Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creating School...' : 'Create School →'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
                <CardTitle className="text-2xl">School Created Successfully!</CardTitle>
                <CardDescription className="mt-2">
                  The school portal is ready to use
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">School URL:</p>
                <p className="text-lg font-semibold text-blue-600 break-all">
                  https://{subdomain}.seth.ng
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  Student Quota: <strong>{maxStudents}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset form
                    setCurrentStep(1);
                    setSchoolName('');
                    setSchoolEmail('');
                    setSchoolPhone('');
                    setSchoolAddress('');
                    setAdminName('');
                    setAdminEmail('');
                    setAdminPassword('');
                    setAdminConfirmPassword('');
                    setSubdomain('');
                    setSubdomainAvailable(null);
                    setMaxStudents(50);
                  }}
                >
                  Create Another School
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/superadmin/schools')}
                >
                  Manage All Schools →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
