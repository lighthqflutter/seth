'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTemplate } from '@/lib/reportCardTemplates/templateCRUD';
import {
  assignTemplateToClasses,
  assignTemplateToLevels,
  unassignTemplateFromClasses,
  unassignTemplateFromLevels,
  getTemplateAssignmentSummary,
} from '@/lib/reportCardTemplates/templateAssignment';
import { ReportCardTemplate } from '@/types/reportCardTemplate';
import { Class } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AssignTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<ReportCardTemplate | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [levels, setLevels] = useState<string[]>([]);

  // Assignment state
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [assignmentSummary, setAssignmentSummary] = useState<{
    totalAffectedClasses: number;
    levelNames: string[];
  } | null>(null);

  const templateId = params.templateId as string;

  // Load template and classes
  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        setLoading(true);

        // Load template
        const templateData = await getTemplate(templateId);
        if (!templateData) {
          alert('Template not found');
          router.push('/dashboard/settings/report-cards');
          return;
        }
        setTemplate(templateData);
        setSelectedClasses(templateData.assignedToClasses || []);
        setSelectedLevels(templateData.assignedToLevels || []);

        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnap = await getDocs(classesQuery);
        const classesData = classesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Class[];
        setClasses(classesData);

        // Extract unique levels
        const uniqueLevels = Array.from(new Set(classesData.map((c) => c.level))).sort();
        setLevels(uniqueLevels);

        // Load assignment summary
        const summary = await getTemplateAssignmentSummary(templateId, user.tenantId);
        setAssignmentSummary({
          totalAffectedClasses: summary.totalAffectedClasses,
          levelNames: summary.levelNames,
        });
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load template data');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadData();
    }
  }, [templateId, user?.tenantId, authLoading, user, router]);

  // Toggle class selection
  const toggleClass = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Toggle level selection
  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  // Save assignments
  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      // Get original assignments
      const originalClasses = template.assignedToClasses || [];
      const originalLevels = template.assignedToLevels || [];

      // Determine what to assign/unassign
      const classesToAssign = selectedClasses.filter((id) => !originalClasses.includes(id));
      const classesToUnassign = originalClasses.filter((id) => !selectedClasses.includes(id));
      const levelsToAssign = selectedLevels.filter((l) => !originalLevels.includes(l));
      const levelsToUnassign = originalLevels.filter((l) => !selectedLevels.includes(l));

      // Execute assignments
      if (classesToAssign.length > 0) {
        await assignTemplateToClasses(templateId, classesToAssign);
      }
      if (classesToUnassign.length > 0) {
        await unassignTemplateFromClasses(templateId, classesToUnassign);
      }
      if (levelsToAssign.length > 0) {
        await assignTemplateToLevels(templateId, levelsToAssign);
      }
      if (levelsToUnassign.length > 0) {
        await unassignTemplateFromLevels(templateId, levelsToUnassign);
      }

      alert('Template assignments saved successfully');
      router.push('/dashboard/settings/report-cards');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save assignments');
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
            Only administrators can manage template assignments.
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

  if (!template) {
    return null;
  }

  // Group classes by level
  const classesByLevel = levels.reduce((acc, level) => {
    acc[level] = classes.filter((c) => c.level === level);
    return acc;
  }, {} as Record<string, Class[]>);

  // Calculate affected classes count
  const affectedClassesFromLevels = selectedLevels.flatMap(
    (level) => classesByLevel[level]?.map((c) => c.id) || []
  );
  const totalAffectedClasses = new Set([...selectedClasses, ...affectedClassesFromLevels]).size;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assign Template</h1>
            <p className="text-gray-600 mt-1">
              Assign "{template.name}" to specific classes or class levels
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/settings/report-cards')}
          >
            Cancel
          </Button>
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Currently Assigned To</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {totalAffectedClasses} {totalAffectedClasses === 1 ? 'Class' : 'Classes'}
                </div>
              </div>
              {selectedLevels.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600">Levels</div>
                  <div className="text-lg font-medium text-gray-900 mt-1">
                    {selectedLevels.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign by Level */}
        <Card>
          <CardHeader>
            <CardTitle>Assign by Class Level</CardTitle>
            <CardDescription>
              Select levels to assign this template to all classes in those levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {levels.map((level) => {
                const levelClasses = classesByLevel[level] || [];
                const isSelected = selectedLevels.includes(level);

                return (
                  <label
                    key={level}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLevel(level)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{level}</div>
                        <div className="text-sm text-gray-600">
                          {levelClasses.length} {levelClasses.length === 1 ? 'class' : 'classes'}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        SELECTED
                      </span>
                    )}
                  </label>
                );
              })}

              {levels.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No class levels found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assign to Specific Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Assign to Specific Classes</CardTitle>
            <CardDescription>
              Select individual classes for more granular control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {levels.map((level) => {
                const levelClasses = classesByLevel[level] || [];
                if (levelClasses.length === 0) return null;

                return (
                  <div key={level}>
                    <div className="font-medium text-gray-700 mb-2">{level}</div>
                    <div className="space-y-2 ml-2">
                      {levelClasses.map((cls) => {
                        const isSelected = selectedClasses.includes(cls.id);
                        const isLevelSelected = selectedLevels.includes(level);

                        return (
                          <label
                            key={cls.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected || isLevelSelected
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            } ${isLevelSelected ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected || isLevelSelected}
                                onChange={() => toggleClass(cls.id)}
                                disabled={isLevelSelected}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {cls.name}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {cls.studentCount} students
                                </div>
                              </div>
                            </div>
                            {isLevelSelected && (
                              <span className="text-xs text-blue-700">via level</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {classes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No classes found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/settings/report-cards')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
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
            'Save Assignments'
          )}
        </Button>
      </div>
    </div>
  );
}
