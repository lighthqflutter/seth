'use client';

import { CreateTemplateInput } from '@/types/reportCardTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step4Props {
  templateConfig: Partial<CreateTemplateInput>;
  updateConfig: (updates: Partial<CreateTemplateInput>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function Step4Layout({
  templateConfig,
  updateConfig,
  onNext,
  onPrevious,
}: Step4Props) {
  const layout = templateConfig.layout!;

  const updateLayout = (updates: Partial<typeof layout>) => {
    updateConfig({
      layout: {
        ...layout,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Layout Customization</h2>
        <p className="text-gray-600 mt-2">
          Configure page settings and layout options for your report card.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'A4' as const, label: 'A4', desc: '210 × 297mm' },
                  { value: 'Letter' as const, label: 'Letter', desc: '8.5 × 11"' },
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() => updateLayout({ pageSize: size.value })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      layout.pageSize === size.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{size.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{size.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'portrait' as const, label: 'Portrait', icon: '📄' },
                  { value: 'landscape' as const, label: 'Landscape', icon: '🖼️' },
                ].map((orient) => (
                  <button
                    key={orient.value}
                    onClick={() => updateLayout({ orientation: orient.value })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      layout.orientation === orient.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{orient.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{orient.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Margins (mm)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'top' as const, label: 'Top' },
                  { key: 'right' as const, label: 'Right' },
                  { key: 'bottom' as const, label: 'Bottom' },
                  { key: 'left' as const, label: 'Left' },
                ].map((margin) => (
                  <div key={margin.key}>
                    <label className="block text-xs text-gray-600 mb-1">{margin.label}</label>
                    <input
                      type="number"
                      min="10"
                      max="50"
                      value={layout.margins?.[margin.key] || 20}
                      onChange={(e) =>
                        updateLayout({
                          margins: {
                            ...layout.margins,
                            [margin.key]: parseInt(e.target.value) || 20,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Layout Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Preset Mode */}
              <button
                onClick={() => updateLayout({ mode: 'preset' })}
                className={`w-full text-left px-4 py-4 rounded-lg border-2 transition-colors ${
                  layout.mode === 'preset'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Preset Layout</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Use the predefined layout from your selected template
                    </div>
                  </div>
                  {layout.mode === 'preset' && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
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
              </button>

              {/* Custom Mode */}
              <button
                onClick={() => updateLayout({ mode: 'custom' })}
                className={`w-full text-left px-4 py-4 rounded-lg border-2 transition-colors ${
                  layout.mode === 'custom'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      Custom Layout
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        Advanced
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Build a custom layout with drag-and-drop rows and columns
                    </div>
                  </div>
                  {layout.mode === 'custom' && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
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
              </button>
            </div>

            {/* Custom Layout Builder (Coming Soon) */}
            {layout.mode === 'custom' && (
              <div className="mt-4 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-3">🚧</div>
                  <div className="font-semibold text-gray-900 mb-2">
                    Custom Layout Builder
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    The drag-and-drop custom layout builder is coming soon. For now, you can use
                    the preset layout and customize it after creation.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateLayout({ mode: 'preset' })}
                  >
                    Switch to Preset Layout
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scores Table Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Scores Table Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'showCABreakdown' as const, label: 'Show CA Breakdown', desc: 'CA1, CA2, CA3' },
                { key: 'showPercentage' as const, label: 'Show Percentage', desc: '75%' },
                { key: 'showGrade' as const, label: 'Show Grade', desc: 'A, B, C' },
                { key: 'showRemark' as const, label: 'Show Remark', desc: 'Excellent, Good' },
              ].map((option) => (
                <label
                  key={option.key}
                  className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={templateConfig.scoresTable?.[option.key] ?? true}
                    onChange={(e) =>
                      updateConfig({
                        scoresTable: {
                          ...templateConfig.scoresTable!,
                          [option.key]: e.target.checked,
                        },
                      })
                    }
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments & Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.comments?.showTeacherComment ?? true}
                onChange={(e) =>
                  updateConfig({
                    comments: {
                      ...templateConfig.comments!,
                      showTeacherComment: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Teacher's Comment</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.comments?.showPrincipalComment ?? true}
                onChange={(e) =>
                  updateConfig({
                    comments: {
                      ...templateConfig.comments!,
                      showPrincipalComment: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Principal's Comment</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.comments?.showSignature ?? true}
                onChange={(e) =>
                  updateConfig({
                    comments: {
                      ...templateConfig.comments!,
                      showSignature: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Signatures</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance & Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.attendance?.enabled ?? true}
                onChange={(e) =>
                  updateConfig({
                    attendance: {
                      ...templateConfig.attendance!,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Attendance Section</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={templateConfig.skills?.enabled ?? true}
                onChange={(e) =>
                  updateConfig({
                    skills: {
                      ...templateConfig.skills!,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Skills & Conduct Section</span>
            </label>

            {templateConfig.skills?.enabled && (
              <div className="ml-7 mt-3 space-y-2">
                <label className="block text-xs text-gray-600 mb-1">Display Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'table' as const, label: 'Table' },
                    { value: 'grid' as const, label: 'Grid' },
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() =>
                        updateConfig({
                          skills: {
                            ...templateConfig.skills!,
                            displayStyle: style.value,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded border-2 text-sm transition-colors ${
                        templateConfig.skills?.displayStyle === style.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onPrevious}>
          ← Previous
        </Button>
        <Button onClick={onNext}>Next: Preview & Save →</Button>
      </div>
    </div>
  );
}
