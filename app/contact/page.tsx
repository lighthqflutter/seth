'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [schoolName, setSchoolName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create mailto link with pre-filled content
      const subject = encodeURIComponent(`School Portal Inquiry - ${schoolName}`);
      const body = encodeURIComponent(`
School Information Request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCHOOL DETAILS:
School Name: ${schoolName}
Contact Person: ${contactName}
Email: ${email}
Phone: ${phone}
Estimated Student Count: ${studentCount || 'Not specified'}

MESSAGE:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from SETH School Portal Contact Form
      `.trim());

      const mailtoLink = `mailto:hello@seth.ng?subject=${subject}&body=${body}`;

      // Open mailto link
      window.location.href = mailtoLink;

      // Show success message
      setSubmitted(true);
    } catch (err: any) {
      console.error('Contact form error:', err);
      setError('Failed to send inquiry. Please try emailing support@lighthousemultimedia.net directly.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <CardTitle className="text-2xl">Inquiry Sent!</CardTitle>
              <CardDescription className="mt-2">
                Your email client should have opened with a pre-filled message
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900 mb-2">
                <strong>What's next?</strong>
              </p>
              <ul className="space-y-1 text-blue-800">
                <li>• Review and send the email from your email client</li>
                <li>• Our team will respond within 24 hours</li>
                <li>• We'll help set up your school portal and student quota</li>
              </ul>
            </div>

            <div className="text-xs text-gray-600 text-center">
              <p>If your email client didn't open, please contact us directly:</p>
              <div className="mt-2 space-y-1">
                <div>
                  <a href="mailto:hello@seth.ng" className="text-blue-600 hover:underline font-medium">
                    hello@seth.ng
                  </a>
                </div>
                <div>
                  <a href="tel:+2348106940120" className="text-blue-600 hover:underline font-medium">
                    +234 810 694 0120
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setSchoolName('');
                  setContactName('');
                  setEmail('');
                  setPhone('');
                  setStudentCount('');
                  setMessage('');
                }}
              >
                Send Another
              </Button>
              <Link href="/">
                <Button className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">SETH</h1>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Get Started with Your School Portal</h2>
          <p className="text-gray-600 mt-2">
            Tell us about your school and we'll set up your portal within 24 hours
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
            <CardDescription>
              Fill out this form and we'll contact you to set up your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                label="Contact Person Name"
                placeholder="John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />

              <Input
                type="email"
                label="Email Address"
                placeholder="admin@cedarschool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                type="tel"
                label="Phone Number"
                placeholder="+234 xxx xxxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <Input
                type="number"
                label="Estimated Number of Students (Optional)"
                placeholder="e.g., 100"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Information (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your school, when you'd like to start, or any questions you have..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/500 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">What happens next?</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• We'll review your information</li>
                  <li>• Set up your custom school portal (yourschool.seth.ng)</li>
                  <li>• Create your admin account</li>
                  <li>• Send you login credentials within 24 hours</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Inquiry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Alternative Contact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Prefer to call or email directly?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="mailto:hello@seth.ng" className="text-blue-600 font-medium hover:underline">
              hello@seth.ng
            </a>
            <span className="text-gray-400">|</span>
            <a href="tel:+2348106940120" className="text-blue-600 font-medium hover:underline">
              +234 810 694 0120
            </a>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
