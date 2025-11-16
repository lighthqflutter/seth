'use client';

import { useState } from 'react';
import { CreateTemplateInput } from '@/types/reportCardTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step5Props {
  templateConfig: Partial<CreateTemplateInput>;
  isNewTemplate: boolean;
  onSave: (name: string, description: string, setAsDefault: boolean) => Promise<void>;
  onPrevious: () => void;
  saving: boolean;
}

export default function Step5Preview({
  templateConfig,
  isNewTemplate,
  onSave,
  onPrevious,
  saving,
}: Step5Props) {
  const [name, setName] = useState(templateConfig.name || '');
  const [description, setDescription] = useState(templateConfig.description || '');
  const [setAsDefault, setSetAsDefault] = useState(templateConfig.isDefault || false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (name.trim().length < 3) {
      alert('Template name must be at least 3 characters');
      return;
    }

    // Check if custom layout mode is selected (not yet supported)
    if (templateConfig.layout?.mode === 'custom') {
      alert('Custom layout mode is not yet available. Please go back to Step 4 and select "Preset Layout".');
      return;
    }

    await onSave(name.trim(), description.trim(), setAsDefault);
  };

  const enabledSections = templateConfig.layout?.sections?.filter((s) => s.enabled) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Preview & Save Template</h2>
        <p className="text-gray-600 mt-2">
          Review your template configuration and give it a name before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template Details Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., JSS1 Report Card 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {name.length}/100 characters
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </p>
              </div>

              {/* Set as Default */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Set as Default</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      This template will be used for all classes unless otherwise specified
                    </div>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full h-12 text-base"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              `${isNewTemplate ? 'Create' : 'Update'} Template`
            )}
          </Button>
        </div>

        {/* Right: Configuration Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Template Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Template Type</div>
                  <div className="font-medium text-gray-900 capitalize mt-1">
                    {templateConfig.templateType || 'Custom'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Layout Mode</div>
                  <div className="font-medium text-gray-900 capitalize mt-1">
                    {templateConfig.layout?.mode || 'Preset'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Page Size</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {templateConfig.layout?.pageSize || 'A4'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Orientation</div>
                  <div className="font-medium text-gray-900 capitalize mt-1">
                    {templateConfig.layout?.orientation || 'Portrait'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Enabled Sections ({enabledSections.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {enabledSections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <svg
                      className="w-4 h-4 text-green-600 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-gray-900 capitalize">
                      {section.id.replace(/-/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Branding & Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Header Style</div>
                  <div className="font-medium text-gray-900 capitalize mt-1">
                    {templateConfig.branding?.headerStyle || 'Classic'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Color Scheme</div>
                  <div className="font-medium text-gray-900 capitalize mt-1">
                    {templateConfig.branding?.colorScheme || 'Primary'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Header Font</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {templateConfig.branding?.fonts?.header || 'Helvetica-Bold'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Font Size</div>
                  <div className="font-medium text-gray-900 mt-1 capitalize">
                    {templateConfig.branding?.fonts?.size || 'Medium'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-gray-600 text-sm mb-2">Header Elements</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'showLogo', label: 'Logo' },
                    { key: 'showSchoolName', label: 'School Name' },
                    { key: 'showMotto', label: 'Motto' },
                    { key: 'showAddress', label: 'Address' },
                  ].map((item) => (
                    <span
                      key={item.key}
                      className={`px-2 py-1 text-xs rounded ${
                        templateConfig.branding?.[item.key as keyof typeof templateConfig.branding]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scores Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scores Table Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'showCABreakdown', label: 'CA Breakdown' },
                  { key: 'showPercentage', label: 'Percentage' },
                  { key: 'showGrade', label: 'Grade' },
                  { key: 'showRemark', label: 'Remark' },
                  { key: 'showPosition', label: 'Position' },
                ].map((item) => (
                  <span
                    key={item.key}
                    className={`px-3 py-1 text-sm rounded ${
                      templateConfig.scoresTable?.[item.key as keyof typeof templateConfig.scoresTable]
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visual Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">📄</div>
                <div className="font-medium text-gray-900 mb-2">PDF Preview Coming Soon</div>
                <div className="text-sm text-gray-600">
                  A live PDF preview will be available in a future update. For now, you can create
                  the template and test it by generating a report card.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Custom Layout Warning */}
      {templateConfig.layout?.mode === 'custom' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-900">
                Cannot Save: Custom Layout Not Yet Available
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Custom layout mode is coming soon. Please go back to Step 4 and select "Preset Layout" to save your template.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onPrevious} disabled={saving}>
          ← Previous
        </Button>
        <div className="text-sm text-gray-600">
          Review your configuration and click the save button above
        </div>
      </div>
    </div>
  );
}
