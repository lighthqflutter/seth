'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Students',
      value: '0',
      change: '+0 this month',
      icon: '📚',
      href: '/dashboard/students',
    },
    {
      name: 'Teachers',
      value: '0',
      change: 'Active staff',
      icon: '👨‍🏫',
      href: '/dashboard/teachers',
    },
    {
      name: 'Classes',
      value: '0',
      change: 'Academic year 2024/25',
      icon: '🏫',
      href: '/dashboard/classes',
    },
    {
      name: 'Pending Scores',
      value: '0',
      change: 'To be published',
      icon: '📝',
      href: '/dashboard/scores',
    },
  ];

  const quickActions = [
    {
      name: 'Add Student',
      description: 'Register a new student',
      icon: '➕',
      href: '/dashboard/students/new',
      roles: ['admin'],
    },
    {
      name: 'Enter Scores',
      description: 'Record student assessments',
      icon: '✍️',
      href: '/dashboard/scores/new',
      roles: ['admin', 'teacher'],
    },
    {
      name: 'Generate Results',
      description: 'Create report cards',
      icon: '📊',
      href: '/dashboard/results/generate',
      roles: ['admin'],
    },
    {
      name: 'View Reports',
      description: 'See all results',
      icon: '📄',
      href: '/dashboard/results',
      roles: ['admin', 'teacher', 'parent'],
    },
  ];

  // Filter quick actions based on role
  const filteredActions = quickActions.filter((action) =>
    !action.roles || action.roles.includes(user?.role || 'parent')
  );

  const recentActivity = [
    // Mock data - will be replaced with real Firestore data
    { id: 1, text: 'Welcome to your school dashboard!', time: 'Just now' },
    { id: 2, text: 'Set up your school profile to get started', time: '1 min ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {user?.role === 'admin' && "Here's what's happening in your school today"}
          {user?.role === 'teacher' && 'Ready to enter scores and manage your classes'}
          {user?.role === 'parent' && "View your children's academic progress"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <span className="text-2xl">{stat.icon}</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filteredActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{action.icon}</div>
                    <div>
                      <CardTitle className="text-base">{action.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates in your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to set up your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-sm text-gray-600">Upload school logo</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-sm text-gray-600">Add academic terms</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-sm text-gray-600">Create classes</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-sm text-gray-600">Add subjects</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  disabled
                />
                <span className="text-sm text-gray-600">Invite teachers</span>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Go to Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State Message (for new schools) */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Welcome to SchoolPortal! 🎉</CardTitle>
          <CardDescription className="text-blue-700">
            Your school has been successfully created. Start by adding students, teachers, and classes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/students">
              <Button>Add Students</Button>
            </Link>
            <Link href="/dashboard/teachers">
              <Button variant="outline">Add Teachers</Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline">School Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
