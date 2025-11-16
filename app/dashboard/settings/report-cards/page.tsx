'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getTemplates } from '@/lib/reportCardTemplates/templateCRUD';
import { ensureDefaultTemplate } from '@/lib/reportCardTemplates/migration';
import { ReportCardTemplate } from '@/types/reportCardTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TemplateCard from './components/TemplateCard';

export default function ReportCardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<ReportCardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Load templates
  const loadTemplates = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      setError(null);

      const templatesData = await getTemplates({
        tenantId: user.tenantId
      });

      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Ensure default template exists (migration)
  useEffect(() => {
    const migrate = async () => {
      if (!user?.tenantId || !user?.uid) return;

      try {
        setMigrating(true);
        const result = await ensureDefaultTemplate(user.tenantId, user.uid);

        if (result.created) {
          console.log('✅ Default template created');
          // Reload templates
          await loadTemplates();
        }
      } catch (err) {
        console.error('Migration error:', err);
      } finally {
        setMigrating(false);
      }
    };

    if (!authLoading && user) {
      migrate();
    }
  }, [user?.tenantId, user?.uid, authLoading]);

  // Load templates on mount
  useEffect(() => {
    if (!authLoading && user) {
      loadTemplates();
    }
  }, [user?.tenantId, authLoading]);

  // Check authorization
  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can manage report card templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (authLoading || loading || migrating) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {migrating ? 'Setting up templates...' : 'Loading templates...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Report Card Templates
        </h1>
        <p className="text-gray-600">
          Create and manage report card templates for different classes and grade levels.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            {templates.length} template{templates.length !== 1 ? 's' : ''} total
            {templates.filter(t => t.isActive).length > 0 && (
              <span className="ml-2">
                • {templates.filter(t => t.isActive).length} active
              </span>
            )}
          </p>
        </div>

        <Button
          onClick={() => router.push('/dashboard/settings/report-cards/builder/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Create New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Templates Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get started by creating your first report card template. Choose from our
                professional presets or build a custom template from scratch.
              </p>
              <Button
                onClick={() => router.push('/dashboard/settings/report-cards/builder/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Your First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUpdate={loadTemplates}
            />
          ))}
        </div>
      )}

      {/* Info Card */}
      {templates.length > 0 && (
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-blue-600 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Managing Report Card Templates
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Templates can be assigned to specific classes or grade levels. When
                  generating report cards, the system will use the assigned template for
                  each class.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
