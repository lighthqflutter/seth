'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SchoolProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  motto: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function SchoolProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SchoolProfile>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    motto: '',
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
  });

  useEffect(() => {
    loadProfile();
  }, [user?.tenantId]);

  const loadProfile = async () => {
    if (!user?.tenantId) return;

    try {
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (tenantDoc.exists()) {
        const data = tenantDoc.data();
        setProfile({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          motto: data.motto || '',
          logoUrl: data.logoUrl || '',
          primaryColor: data.primaryColor || '#2563eb',
          secondaryColor: data.secondaryColor || '#1e40af',
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.tenantId) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'tenants', user.tenantId), {
        name: profile.name.trim(),
        address: profile.address.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim(),
        website: profile.website.trim(),
        motto: profile.motto.trim(),
        logoUrl: profile.logoUrl.trim(),
        primaryColor: profile.primaryColor,
        secondaryColor: profile.secondaryColor,
        updatedAt: new Date(),
      });
      alert('School profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Profile</h1>
          <p className="text-gray-600 mt-1">Manage your school information and branding</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
          Back to Settings
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update your school's basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Name *
              </label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g., SETH International School"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="e.g., 123 Education Avenue, Lagos"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="e.g., +234 123 456 7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="e.g., info@sethschool.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <Input
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="e.g., https://sethschool.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Motto
              </label>
              <Input
                value={profile.motto}
                onChange={(e) => setProfile({ ...profile, motto: e.target.value })}
                placeholder="e.g., Excellence in Education"
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding & Logo</CardTitle>
            <CardDescription>Customize your school's visual identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <Input
                value={profile.logoUrl}
                onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                placeholder="e.g., https://example.com/logo.png"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload your logo to a service like Imgur or Cloudinary and paste the URL here
              </p>
              {profile.logoUrl && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                  <img
                    src={profile.logoUrl}
                    alt="School Logo"
                    className="h-16 w-auto object-contain border border-gray-200 rounded p-2"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Failed to load logo';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Direct file upload is coming soon. For now, upload your logo to an image hosting service and paste the URL above.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={profile.primaryColor}
                    onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={profile.primaryColor}
                    onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
                    placeholder="#2563eb"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={profile.secondaryColor}
                    onChange={(e) => setProfile({ ...profile, secondaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={profile.secondaryColor}
                    onChange={(e) => setProfile({ ...profile, secondaryColor: e.target.value })}
                    placeholder="#1e40af"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || !profile.name.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
