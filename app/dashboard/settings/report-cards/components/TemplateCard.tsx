'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportCardTemplate } from '@/types/reportCardTemplate';
import {
  deleteTemplate,
  cloneTemplate,
  setDefaultTemplate,
  toggleTemplateActive,
} from '@/lib/reportCardTemplates/templateCRUD';
import { getTemplateAssignmentSummary } from '@/lib/reportCardTemplates/templateAssignment';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TemplateCardProps {
  template: ReportCardTemplate;
  onUpdate: () => void;
}

export default function TemplateCard({ template, onUpdate }: TemplateCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentSummary, setAssignmentSummary] = useState<{
    totalAffectedClasses: number;
    levelNames: string[];
  } | null>(null);

  // Load assignment summary
  const loadAssignmentSummary = async () => {
    if (!user?.tenantId) return;

    const summary = await getTemplateAssignmentSummary(template.id, user.tenantId);
    setAssignmentSummary({
      totalAffectedClasses: summary.totalAffectedClasses,
      levelNames: summary.levelNames,
    });
  };

  // Load summary on mount
  useState(() => {
    loadAssignmentSummary();
  });

  const handleClone = async () => {
    setLoading(true);
    try {
      const result = await cloneTemplate(template.id, `${template.name} (Copy)`);
      if (result.success) {
        onUpdate();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Clone error:', error);
      alert('Failed to clone template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteTemplate(template.id);
      if (result.success) {
        onUpdate();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete template');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSetDefault = async () => {
    if (!user?.tenantId) return;

    setLoading(true);
    try {
      const result = await setDefaultTemplate(template.id, user.tenantId);
      if (result.success) {
        onUpdate();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Set default error:', error);
      alert('Failed to set as default');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const result = await toggleTemplateActive(template.id);
      if (result.success) {
        onUpdate();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      alert('Failed to toggle status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`relative ${!template.isActive ? 'opacity-60' : ''}`}>
      {/* Badges */}
      <div className="absolute top-4 right-4 flex gap-2">
        {template.isDefault && (
          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
            DEFAULT
          </span>
        )}
        {!template.isActive && (
          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">
            INACTIVE
          </span>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-lg pr-20">{template.name}</CardTitle>
        {template.description && (
          <CardDescription className="text-sm">{template.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        {/* Template Details */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium capitalize">{template.templateType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Layout:</span>
            <span className="font-medium capitalize">{template.layout.mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sections:</span>
            <span className="font-medium">
              {template.layout.sections.filter(s => s.enabled).length} enabled
            </span>
          </div>
          {assignmentSummary && assignmentSummary.totalAffectedClasses > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Assigned to:</span>
              <span className="font-medium">
                {assignmentSummary.totalAffectedClasses} class
                {assignmentSummary.totalAffectedClasses !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
          {assignmentSummary && assignmentSummary.levelNames.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Levels: {assignmentSummary.levelNames.join(', ')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/settings/report-cards/builder/${template.id}`)}
              disabled={loading}
              className="text-xs"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClone}
              disabled={loading}
              className="text-xs"
            >
              Clone
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!template.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetDefault}
                disabled={loading}
                className="text-xs"
              >
                Set Default
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={loading}
              className="text-xs"
            >
              {template.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || template.isDefault}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs bg-red-50 text-red-700 hover:bg-red-100"
              >
                Confirm Delete
              </Button>
            )}
          </div>

          {template.isDefault && (
            <p className="text-xs text-gray-500 mt-2">
              Cannot delete default template
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
