'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const router = useRouter();

  const settingsCategories = [
    {
      title: 'School Profile',
      description: 'Manage school information, logo, and branding',
      icon: '🏫',
      href: '/dashboard/settings/profile',
    },
    {
      title: 'Email Preferences',
      description: 'Configure email notifications and templates',
      icon: '📧',
      href: '/dashboard/settings/email-preferences',
    },
    {
      title: 'Student Promotion',
      description: 'Configure promotion criteria and graduation settings',
      icon: '🎓',
      href: '/dashboard/settings/promotion',
    },
    {
      title: 'Academic Settings',
      description: 'Configure grading, terms, and academic calendar',
      icon: '📚',
      href: '/dashboard/settings/academic',
      comingSoon: true,
    },
    {
      title: 'User Permissions',
      description: 'Manage roles and access control',
      icon: '🔐',
      href: '/dashboard/settings/permissions',
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your school portal configuration</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {settingsCategories.map((category) => (
          <Card key={category.title} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push(category.href)}
                disabled={category.comingSoon}
                className="w-full"
              >
                {category.comingSoon ? 'Coming Soon' : 'Configure'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
