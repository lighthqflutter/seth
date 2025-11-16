'use client';

import { useState } from 'react';
import { CreateTemplateInput, TemplateSection } from '@/types/reportCardTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step2Props {
  templateConfig: Partial<CreateTemplateInput>;
  updateConfig: (updates: Partial<CreateTemplateInput>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const SECTION_INFO: Record<string, { label: string; description: string; icon: string }> = {
  'header': {
    label: 'Header',
    description: 'School logo, name, motto, and contact information',
    icon: '🏫',
  },
  'student-info': {
    label: 'Student Information',
    description: 'Student name, admission number, class, and photo',
    icon: '👤',
  },
  'scores-table': {
    label: 'Scores Table',
    description: 'Subject grades with CA breakdown and totals',
    icon: '📊',
  },
  'summary': {
    label: 'Performance Summary',
    description: 'Total marks, average, position, and grade',
    icon: '📈',
  },
  'skills': {
    label: 'Skills & Conduct',
    description: 'Behavioral and skill ratings',
    icon: '⭐',
  },
  'attendance': {
    label: 'Attendance',
    description: 'Days present, absent, and attendance rate',
    icon: '✅',
  },
  'comments': {
    label: 'Comments',
    description: 'Teacher and principal remarks with signatures',
    icon: '💬',
  },
  'footer': {
    label: 'Footer',
    description: 'Term dates, next term information, and disclaimers',
    icon: '📄',
  },
};

export default function Step2ConfigureSections({
  templateConfig,
  updateConfig,
  onNext,
  onPrevious,
}: Step2Props) {
  const sections = templateConfig.layout?.sections || [];

  const toggleSection = (sectionId: string) => {
    const updatedSections = sections.map((section) =>
      section.id === sectionId ? { ...section, enabled: !section.enabled } : section
    );

    updateConfig({
      layout: {
        ...templateConfig.layout!,
        sections: updatedSections,
      },
    });
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;

    const updatedSections = [...sections];
    const temp = updatedSections[index - 1];
    updatedSections[index - 1] = updatedSections[index];
    updatedSections[index] = temp;

    // Update order values
    updatedSections.forEach((section, idx) => {
      section.order = idx;
    });

    updateConfig({
      layout: {
        ...templateConfig.layout!,
        sections: updatedSections,
      },
    });
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;

    const updatedSections = [...sections];
    const temp = updatedSections[index + 1];
    updatedSections[index + 1] = updatedSections[index];
    updatedSections[index] = temp;

    // Update order values
    updatedSections.forEach((section, idx) => {
      section.order = idx;
    });

    updateConfig({
      layout: {
        ...templateConfig.layout!,
        sections: updatedSections,
      },
    });
  };

  const handleNext = () => {
    const enabledCount = sections.filter((s) => s.enabled).length;
    if (enabledCount === 0) {
      alert('Please enable at least one section');
      return;
    }
    onNext();
  };

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configure Sections</h2>
        <p className="text-gray-600 mt-2">
          Enable or disable sections and reorder them to match your preferred layout.
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{enabledCount}</span> of{' '}
            <span className="font-semibold text-gray-900">{sections.length}</span> sections enabled
          </span>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sections.map((section, index) => {
          const info = SECTION_INFO[section.id] || {
            label: section.id,
            description: '',
            icon: '📋',
          };

          return (
            <Card
              key={section.id}
              className={`${
                section.enabled
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-3xl">{info.icon}</div>

                  {/* Section Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{info.label}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{info.description}</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Move Up/Down */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveSectionUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSectionDown(index)}
                        disabled={index === sections.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        section.enabled ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          section.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warning if no sections enabled */}
      {enabledCount === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-yellow-600 mt-0.5"
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
            <p className="ml-3 text-sm text-yellow-800">
              At least one section must be enabled to create a valid template.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onPrevious}>
          ← Previous
        </Button>
        <Button onClick={handleNext} disabled={enabledCount === 0}>
          Next: Branding →
        </Button>
      </div>
    </div>
  );
}
