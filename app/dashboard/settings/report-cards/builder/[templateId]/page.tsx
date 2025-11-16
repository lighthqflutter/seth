'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTemplate } from '@/lib/reportCardTemplates/templateCRUD';
import { getAllPresets } from '@/lib/reportCardTemplates/presets';
import { ReportCardTemplate } from '@/types/reportCardTemplate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<ReportCardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  const templateId = params.templateId as string;

  useEffect(() => {
    const loadTemplate = async () => {
      if (!user?.tenantId) return;

      try {
        setLoading(true);

        if (templateId === 'new') {
          // Creating new template
          setIsNewTemplate(true);
          setTemplate(null);
        } else {
          // Editing existing template
          const templateData = await getTemplate(templateId);
          setTemplate(templateData);
          setIsNewTemplate(false);
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadTemplate();
    }
  }, [templateId, user?.tenantId, authLoading]);

  // Check authorization
  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can create or edit report card templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading template builder...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isNewTemplate ? 'Create New Template' : 'Edit Template'}
            </h1>
            <p className="text-gray-600">
              {isNewTemplate
                ? 'Choose a preset or build a custom report card template from scratch'
                : `Editing: ${template?.name || 'Template'}`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/settings/report-cards')}
          >
            ← Back to Templates
          </Button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">🚧 Wizard Under Construction</CardTitle>
          <CardDescription className="text-blue-800">
            The 5-step template builder wizard is currently being developed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-blue-900 font-medium">What's coming:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Step 1: Choose Template</h3>
                <p className="text-sm text-blue-800">
                  Select from 4 professional presets: Classic, Modern, Compact, or Comprehensive
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Step 2: Configure Sections</h3>
                <p className="text-sm text-blue-800">
                  Enable/disable sections and customize what appears on the report card
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Step 3: Branding & Style</h3>
                <p className="text-sm text-blue-800">
                  Customize logo position, colors, fonts, and header styles
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Step 4: Layout Options</h3>
                <p className="text-sm text-blue-800">
                  Use preset layouts or unlock custom drag-and-drop mode
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Step 5: Preview & Save</h3>
                <p className="text-sm text-blue-800">
                  See live PDF preview and save your custom template
                </p>
              </div>
            </div>

            {isNewTemplate && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">
                  In the meantime, use the Clone feature:
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Go back to the template list</li>
                  <li>Click "Clone" on any existing template</li>
                  <li>The cloned template will appear with " (Copy)" in its name</li>
                  <li>You can then activate/deactivate and assign it to classes</li>
                </ol>
              </div>
            )}

            {!isNewTemplate && template && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Current Template Details:</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{template.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{template.templateType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Layout Mode:</span>
                    <span className="capitalize">{template.layout.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sections:</span>
                    <span>{template.layout.sections.filter(s => s.enabled).length} enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span>{template.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Default:</span>
                    <span>{template.isDefault ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/settings/report-cards')}
        >
          ← Back to Template List
        </Button>
        {!isNewTemplate && template && (
          <Button
            variant="outline"
            onClick={() => {
              // Clone the current template as a workaround
              router.push('/dashboard/settings/report-cards');
            }}
          >
            Clone This Template Instead
          </Button>
        )}
      </div>
    </div>
  );
}
