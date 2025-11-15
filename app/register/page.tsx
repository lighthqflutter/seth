'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Step 3: Subdomain
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">SchoolPortal</h1>
          </Link>
          <p className="text-gray-600">Create your school account</p>
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
                Tell us about your school
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
                  <Link href="/" className="flex-1">
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
                Set up your administrator account
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
                  placeholder="Re-enter your password"
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

        {/* Step 3: Subdomain */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your School URL</CardTitle>
              <CardDescription>
                This will be your school's unique web address
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Your school URL will be:</p>
                  <p className="text-lg font-semibold text-blue-600">
                    https://{subdomain || 'yourschool'}.seth.ng
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
                  Your school portal is ready to use
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Your school URL:</p>
                <p className="text-lg font-semibold text-blue-600 break-all">
                  https://{subdomain}.seth.ng
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-3">Next Steps:</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">□</span>
                    Upload school logo
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">□</span>
                    Add academic terms
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">□</span>
                    Create classes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">□</span>
                    Add subjects
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">□</span>
                    Invite teachers
                  </li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Back to Login */}
        {currentStep < 4 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
