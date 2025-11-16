'use client';

import { useState } from 'react';
import { CreateTemplateInput } from '@/types/reportCardTemplate';
import { TEMPLATE_PREVIEWS, getPresetByType } from '@/lib/reportCardTemplates/presets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step1Props {
  templateConfig: Partial<CreateTemplateInput>;
  updateConfig: (updates: Partial<CreateTemplateInput>) => void;
  onNext: () => void;
}

type TemplateType = 'classic' | 'modern' | 'compact' | 'comprehensive';

export default function Step1SelectTemplate({ templateConfig, updateConfig, onNext }: Step1Props) {
  const [selectedType, setSelectedType] = useState<TemplateType | null>(
    templateConfig.templateType as TemplateType || null
  );

  const handleSelectTemplate = (type: TemplateType) => {
    setSelectedType(type);

    // Get the preset template configuration
    const presetConfig = getPresetByType(type, 'temp-tenant', 'temp-user');

    // Update config with preset (excluding tenantId and createdBy which will be set on save)
    const { tenantId, createdBy, ...configToApply } = presetConfig;
    updateConfig(configToApply);
  };

  const handleNext = () => {
    if (!selectedType) {
      alert('Please select a template to continue');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose a Template Type</h2>
        <p className="text-gray-600 mt-2">
          Select a base template to start with. You can customize all aspects in the following steps.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATE_PREVIEWS.map((preview) => (
          <Card
            key={preview.type}
            className={`cursor-pointer transition-all border-2 ${
              selectedType === preview.type
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => handleSelectTemplate(preview.type as TemplateType)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{preview.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {preview.description}
                  </CardDescription>
                </div>
                {selectedType === preview.type && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Best For */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Best For:</h4>
                  <p className="text-sm text-gray-600">{preview.bestFor}</p>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {preview.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sections Count */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sections:</span>
                    <span className="font-medium text-gray-900">
                      {preview.sections.length} included
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Template Summary */}
      {selectedType && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
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
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">
                {TEMPLATE_PREVIEWS.find(p => p.type === selectedType)?.name} Selected
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                You can customize all sections, branding, and layout options in the next steps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button
          onClick={handleNext}
          disabled={!selectedType}
          className="px-6"
        >
          Next: Configure Sections →
        </Button>
      </div>
    </div>
  );
}
