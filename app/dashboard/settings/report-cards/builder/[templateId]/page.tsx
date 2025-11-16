'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTemplate, createTemplate, updateTemplate } from '@/lib/reportCardTemplates/templateCRUD';
import { CreateTemplateInput, ReportCardTemplate } from '@/types/reportCardTemplate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import wizard steps
import Step1SelectTemplate from '../../components/wizard/Step1SelectTemplate';
import Step2ConfigureSections from '../../components/wizard/Step2ConfigureSections';
import Step3Branding from '../../components/wizard/Step3Branding';
import Step4Layout from '../../components/wizard/Step4Layout';
import Step5Preview from '../../components/wizard/Step5Preview';

type WizardStep = 1 | 2 | 3 | 4 | 5;

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template configuration state
  const [templateConfig, setTemplateConfig] = useState<Partial<CreateTemplateInput>>({
    layout: {
      mode: 'preset',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sections: [],
    },
    branding: {
      logoPosition: 'left',
      showLogo: true,
      showSchoolName: true,
      showMotto: true,
      showAddress: true,
      headerStyle: 'classic',
      colorScheme: 'primary',
    },
    scoresTable: {
      columns: ['Subject', 'CA1', 'CA2', 'CA3', 'Exam', 'Total', 'Grade', 'Remark'],
      showCABreakdown: true,
      showPercentage: true,
      showGrade: true,
      showRemark: true,
      showPosition: true,
      remarkType: 'auto',
    },
    comments: {
      showTeacherComment: true,
      showPrincipalComment: true,
      maxLength: 500,
      showSignature: true,
    },
    attendance: {
      enabled: true,
      showDaysPresent: true,
      showDaysAbsent: true,
      showAttendanceRate: true,
    },
    skills: {
      enabled: true,
      displayStyle: 'table',
      showDescriptions: false,
    },
  });

  const templateId = params.templateId as string;

  // Load template if editing
  useEffect(() => {
    const loadTemplate = async () => {
      if (!user?.tenantId) return;

      try {
        setLoading(true);

        if (templateId === 'new') {
          setIsNewTemplate(true);
        } else {
          const templateData = await getTemplate(templateId);
          if (templateData) {
            setTemplateConfig(templateData);
            setIsNewTemplate(false);
          }
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

  // Update template configuration
  const updateConfig = (updates: Partial<CreateTemplateInput>) => {
    setTemplateConfig(prev => ({
      ...prev,
      ...updates,
    }));
  };

  // Navigate between steps
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  // Save template
  const handleSave = async (name: string, description: string, setAsDefault: boolean) => {
    if (!user?.tenantId || !user?.uid) return;

    setSaving(true);
    try {
      const templateData: CreateTemplateInput = {
        ...templateConfig as CreateTemplateInput,
        tenantId: user.tenantId,
        name,
        description,
        isDefault: setAsDefault,
        isActive: true,
        assignedToClasses: [],
        assignedToLevels: [],
        createdBy: user.uid,
      };

      let result;
      if (isNewTemplate) {
        result = await createTemplate(templateData);
      } else {
        result = await updateTemplate(templateId, templateData);
      }

      if (result.success) {
        router.push('/dashboard/settings/report-cards');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Check authorization
  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Only administrators can create or edit report card templates.
          </p>
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
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNewTemplate ? 'Create Report Card Template' : 'Edit Template'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNewTemplate
                ? 'Follow the steps below to create your custom template'
                : `Editing: ${templateConfig.name || 'Template'}`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/settings/report-cards')}
          >
            Cancel
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <button
                onClick={() => goToStep(step as WizardStep)}
                className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-colors ${
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : currentStep > step
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step ? '✓' : step}
              </button>
              {step < 5 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex gap-2 mt-2">
          <div className="flex-1 text-center text-xs text-gray-600">Template</div>
          <div className="flex-1 text-center text-xs text-gray-600">Sections</div>
          <div className="flex-1 text-center text-xs text-gray-600">Branding</div>
          <div className="flex-1 text-center text-xs text-gray-600">Layout</div>
          <div className="flex-1 text-center text-xs text-gray-600">Preview</div>
        </div>
      </div>

      {/* Wizard Steps */}
      <div className="mt-8">
        {currentStep === 1 && (
          <Step1SelectTemplate
            templateConfig={templateConfig}
            updateConfig={updateConfig}
            onNext={nextStep}
          />
        )}

        {currentStep === 2 && (
          <Step2ConfigureSections
            templateConfig={templateConfig}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )}

        {currentStep === 3 && (
          <Step3Branding
            templateConfig={templateConfig}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )}

        {currentStep === 4 && (
          <Step4Layout
            templateConfig={templateConfig}
            updateConfig={updateConfig}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )}

        {currentStep === 5 && (
          <Step5Preview
            templateConfig={templateConfig}
            isNewTemplate={isNewTemplate}
            onSave={handleSave}
            onPrevious={previousStep}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
