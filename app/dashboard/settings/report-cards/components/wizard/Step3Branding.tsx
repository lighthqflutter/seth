'use client';

import { CreateTemplateInput } from '@/types/reportCardTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step3Props {
  templateConfig: Partial<CreateTemplateInput>;
  updateConfig: (updates: Partial<CreateTemplateInput>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function Step3Branding({
  templateConfig,
  updateConfig,
  onNext,
  onPrevious,
}: Step3Props) {
  const branding = templateConfig.branding!;

  const updateBranding = (updates: Partial<typeof branding>) => {
    updateConfig({
      branding: {
        ...branding,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Branding & Styling</h2>
        <p className="text-gray-600 mt-2">
          Customize the appearance and branding elements of your report card.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Header Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['left', 'center', 'right'] as const).map((position) => (
                  <button
                    key={position}
                    onClick={() => updateBranding({ logoPosition: position })}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      branding.logoPosition === position
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {position.charAt(0).toUpperCase() + position.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Show/Hide Elements */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Display Elements
              </label>
              {[
                { key: 'showLogo' as const, label: 'Show Logo' },
                { key: 'showSchoolName' as const, label: 'Show School Name' },
                { key: 'showMotto' as const, label: 'Show Motto' },
                { key: 'showAddress' as const, label: 'Show Address' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branding[item.key]}
                    onChange={(e) => updateBranding({ [item.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Header Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Header Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Layout
              </label>
              <div className="space-y-2">
                {[
                  { value: 'classic' as const, label: 'Classic', desc: 'Traditional centered layout' },
                  { value: 'modern' as const, label: 'Modern', desc: 'Logo left, info right' },
                  { value: 'minimal' as const, label: 'Minimal', desc: 'Compact header' },
                ].map((style) => (
                  <button
                    key={style.value}
                    onClick={() => updateBranding({ headerStyle: style.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      branding.headerStyle === style.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Color Scheme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Schemes
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'primary' as const, label: 'Primary Blue', color: 'bg-blue-600' },
                  { value: 'grayscale' as const, label: 'Grayscale', color: 'bg-gray-600' },
                ].map((scheme) => (
                  <button
                    key={scheme.value}
                    onClick={() => updateBranding({ colorScheme: scheme.value })}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      branding.colorScheme === scheme.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${scheme.color}`} />
                      <span className="text-sm font-medium text-gray-900">{scheme.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors Option */}
            <div>
              <button
                onClick={() => updateBranding({ colorScheme: 'custom' })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                  branding.colorScheme === 'custom'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
                  <span className="text-sm font-medium text-gray-900">Custom Colors</span>
                </div>
              </button>

              {branding.colorScheme === 'custom' && (
                <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Custom Color Palette
                  </div>
                  {[
                    { key: 'header' as const, label: 'Header Background' },
                    { key: 'borders' as const, label: 'Borders' },
                    { key: 'grades' as const, label: 'Grades & Accents' },
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-xs text-gray-600 mb-1">{item.label}</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={branding.customColors?.[item.key] || '#000000'}
                          onChange={(e) =>
                            updateBranding({
                              customColors: {
                                header: branding.customColors?.header || '#1e3a8a',
                                borders: branding.customColors?.borders || '#d1d5db',
                                grades: branding.customColors?.grades || '#10b981',
                                [item.key]: e.target.value,
                              },
                            })
                          }
                          className="w-12 h-9 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={branding.customColors?.[item.key] || '#000000'}
                          onChange={(e) =>
                            updateBranding({
                              customColors: {
                                header: branding.customColors?.header || '#1e3a8a',
                                borders: branding.customColors?.borders || '#d1d5db',
                                grades: branding.customColors?.grades || '#10b981',
                                [item.key]: e.target.value,
                              },
                            })
                          }
                          placeholder="#000000"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Font Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Font
              </label>
              <select
                value={branding.fonts?.header || 'Helvetica-Bold'}
                onChange={(e) =>
                  updateBranding({
                    fonts: {
                      header: e.target.value,
                      body: branding.fonts?.body || 'Helvetica',
                      size: branding.fonts?.size || 'medium',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Helvetica-Bold">Helvetica Bold</option>
                <option value="Times-Bold">Times Bold</option>
                <option value="Courier-Bold">Courier Bold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Font
              </label>
              <select
                value={branding.fonts?.body || 'Helvetica'}
                onChange={(e) =>
                  updateBranding({
                    fonts: {
                      header: branding.fonts?.header || 'Helvetica-Bold',
                      body: e.target.value,
                      size: branding.fonts?.size || 'medium',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Helvetica">Helvetica</option>
                <option value="Times-Roman">Times Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'small' as const, label: 'Small' },
                  { value: 'medium' as const, label: 'Medium' },
                  { value: 'large' as const, label: 'Large' },
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() =>
                      updateBranding({
                        fonts: {
                          header: branding.fonts?.header || 'Helvetica-Bold',
                          body: branding.fonts?.body || 'Helvetica',
                          size: size.value,
                        },
                      })
                    }
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      (branding.fonts?.size || 'medium') === size.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
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
          <p className="ml-3 text-sm text-blue-700">
            You'll see a live preview of your branding choices in the final step.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onPrevious}>
          ← Previous
        </Button>
        <Button onClick={onNext}>Next: Layout →</Button>
      </div>
    </div>
  );
}
