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

    // Custom layout is now supported - no need to block
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

          {/* Visual Style Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visual Style Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
                {/* Header Preview */}
                <div className={`border-b-2 pb-4 mb-4 ${
                  templateConfig.branding?.colorScheme === 'primary' ? 'border-blue-600' :
                  templateConfig.branding?.colorScheme === 'grayscale' ? 'border-gray-600' :
                  'border-gray-400'
                }`}>
                  <div className="flex items-center justify-between">
                    {templateConfig.branding?.showLogo && (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        Logo
                      </div>
                    )}
                    <div className={`flex-1 ${templateConfig.branding?.showLogo ? 'ml-4' : ''}`}>
                      {templateConfig.branding?.showSchoolName && (
                        <div className={`font-bold ${
                          templateConfig.branding?.fonts?.size === 'large' ? 'text-xl' :
                          templateConfig.branding?.fonts?.size === 'small' ? 'text-sm' :
                          'text-base'
                        } ${
                          templateConfig.branding?.colorScheme === 'primary' ? 'text-blue-800' :
                          'text-gray-900'
                        }`}>
                          School Name Here
                        </div>
                      )}
                      {templateConfig.branding?.showMotto && (
                        <div className="text-xs text-gray-600 mt-1">School Motto</div>
                      )}
                      {templateConfig.branding?.showAddress && (
                        <div className="text-xs text-gray-500 mt-0.5">School Address</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sample Content */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Student Name:</span>
                    <span className="font-medium">Sample Student</span>
                  </div>

                  {/* Sample Scores Table */}
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className={`${
                        templateConfig.branding?.colorScheme === 'primary' ? 'bg-blue-50' :
                        'bg-gray-50'
                      }`}>
                        <tr>
                          <th className="p-2 text-left border-b">Subject</th>
                          {templateConfig.scoresTable?.showCABreakdown && (
                            <>
                              <th className="p-2 text-center border-b">CA1</th>
                              <th className="p-2 text-center border-b">CA2</th>
                              <th className="p-2 text-center border-b">Exam</th>
                            </>
                          )}
                          <th className="p-2 text-center border-b">Total</th>
                          {templateConfig.scoresTable?.showGrade && (
                            <th className="p-2 text-center border-b">Grade</th>
                          )}
                          {templateConfig.scoresTable?.showPosition && (
                            <th className="p-2 text-center border-b">Pos.</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">Mathematics</td>
                          {templateConfig.scoresTable?.showCABreakdown && (
                            <>
                              <td className="p-2 text-center">18</td>
                              <td className="p-2 text-center">17</td>
                              <td className="p-2 text-center">55</td>
                            </>
                          )}
                          <td className="p-2 text-center font-medium">90</td>
                          {templateConfig.scoresTable?.showGrade && (
                            <td className="p-2 text-center">A1</td>
                          )}
                          {templateConfig.scoresTable?.showPosition && (
                            <td className="p-2 text-center">1st</td>
                          )}
                        </tr>
                        <tr>
                          <td className="p-2">English</td>
                          {templateConfig.scoresTable?.showCABreakdown && (
                            <>
                              <td className="p-2 text-center">19</td>
                              <td className="p-2 text-center">18</td>
                              <td className="p-2 text-center">48</td>
                            </>
                          )}
                          <td className="p-2 text-center font-medium">85</td>
                          {templateConfig.scoresTable?.showGrade && (
                            <td className="p-2 text-center">A1</td>
                          )}
                          {templateConfig.scoresTable?.showPosition && (
                            <td className="p-2 text-center">2nd</td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs text-gray-500 italic mt-4 text-center">
                    This is a style preview. Generate a report card to see the full PDF layout.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
