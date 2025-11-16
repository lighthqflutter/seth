'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.tenantId) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPG, SVG, or WebP)');
      return;
    }

    // Validate file size (500KB = 512000 bytes)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      alert(`Logo file size must be less than 500KB. Your file is ${(file.size / 1024).toFixed(0)}KB.`);
      return;
    }

    setUploading(true);
    try {
      // Create a reference to the storage location
      const fileExtension = file.name.split('.').pop();
      const fileName = `logos/${user.tenantId}/school-logo.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update the profile with the new logo URL
      setProfile({ ...profile, logoUrl: downloadURL });
      alert('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!user?.tenantId || !profile.logoUrl) return;

    if (!confirm('Are you sure you want to delete the logo?')) return;

    try {
      // Only try to delete from storage if it's a Firebase Storage URL
      if (profile.logoUrl.includes('firebasestorage.googleapis.com')) {
        const fileName = `logos/${user.tenantId}/school-logo`;
        // Try to delete all possible extensions
        const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
        for (const ext of extensions) {
          try {
            const storageRef = ref(storage, `${fileName}.${ext}`);
            await deleteObject(storageRef);
          } catch (e) {
            // Ignore errors - file might not exist with this extension
          }
        }
      }

      // Clear the logo URL
      setProfile({ ...profile, logoUrl: '' });
      alert('Logo deleted successfully!');
    } catch (error) {
      console.error('Error deleting logo:', error);
      // Still clear the URL even if deletion from storage failed
      setProfile({ ...profile, logoUrl: '' });
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
          <CardContent className="space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Logo File
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <CloudArrowUpIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {uploading ? 'Uploading...' : 'Choose File'}
                  </span>
                </label>
                {profile.logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteLogo}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Max file size: 500KB. Supported formats: PNG, JPG, SVG, WebP
              </p>
            </div>

            {/* Logo Preview */}
            {profile.logoUrl && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img
                    src={profile.logoUrl}
                    alt="School Logo"
                    className="h-20 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const errorMsg = e.currentTarget.nextElementSibling as HTMLElement;
                      if (errorMsg) errorMsg.style.display = 'block';
                    }}
                  />
                  <p className="text-sm text-red-600 mt-2" style={{ display: 'none' }}>
                    ❌ Failed to load logo
                  </p>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* URL Input (Alternative) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL (Alternative)
              </label>
              <Input
                value={profile.logoUrl}
                onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                placeholder="e.g., https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                Or paste a direct link to your logo image
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
