'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PromotionSettings } from '@/types';

export default function PromotionSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'mode' | 'criteria' | 'mapping' | 'graduation' | 'workflow'>('mode');

  const [settings, setSettings] = useState<PromotionSettings>({
    mode: 'automatic',
    allowManualOverride: true,
    criteria: {
      passMark: 40,
      minimumAverageScore: {
        enabled: true,
        value: 50,
      },
      minimumSubjectsPassed: {
        enabled: true,
        value: 5,
      },
      coreSubjectsRequirement: {
        enabled: true,
        type: 'all',
        coreSubjectIds: [],
      },
      attendanceRequirement: {
        enabled: true,
        minimumPercentage: 75,
      },
    },
    levelMapping: {},
    graduation: {
      graduatingLevels: ['SS3'],
      requirements: {
        passAllCoreSubjects: true,
        minimumAverageScore: 50,
        minimumAttendance: 75,
        noOutstandingFees: false,
      },
      failureAction: 'repeat',
      postGraduation: {
        studentStatus: 'graduated',
        keepRecords: true,
        allowAlumniAccess: true,
        generateCertificate: true,
        generateTranscript: true,
      },
    },
    workflow: {
      teachersCanPromote: true,
      requireApproval: true,
    },
    notifications: {
      emailParents: true,
      emailStudents: false,
      notifyAdmins: true,
    },
    academicYearTransition: {
      createNewYear: true,
    },
  });

  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [classLevels, setClassLevels] = useState<string[]>([]);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load current settings and data
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.tenantId) return;

      try {
        // Load tenant settings
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data();
          if (tenantData.settings?.promotion) {
            setSettings(tenantData.settings.promotion);
          }

          // Extract class levels from settings
          if (tenantData.settings?.classLevels?.levels) {
            const levels = tenantData.settings.classLevels.levels.map((l: any) => l.code);
            setClassLevels(levels);
          }
        }

        // Load subjects for core subject selection
        const subjectsSnapshot = await getDoc(doc(db, 'tenants', user.tenantId));
        // For now, we'll use a simple implementation
        // In production, you'd query the subjects collection
        setSubjects([]);

        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.tenantId]);

  const handleSave = async () => {
    if (!user?.tenantId) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'tenants', user.tenantId), {
        'settings.promotion': settings,
        updatedAt: new Date(),
      });

      alert('Promotion settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Settings
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Student Promotion Settings</h1>
        <p className="text-gray-600 mt-1">Configure how student promotions work in your school</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'mode', label: 'Promotion Mode' },
            { id: 'criteria', label: 'Criteria' },
            { id: 'mapping', label: 'Class Mapping' },
            { id: 'graduation', label: 'Graduation' },
            { id: 'workflow', label: 'Workflow' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'mode' && (
          <Card>
            <CardHeader>
              <CardTitle>Promotion Mode</CardTitle>
              <CardDescription>Choose how promotions are handled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={settings.mode === 'automatic'}
                    onChange={() => setSettings({ ...settings, mode: 'automatic' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Automatic Promotion (Criteria-based)</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Students automatically promoted if they meet criteria. Manual overrides allowed.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={settings.mode === 'manual'}
                    onChange={() => setSettings({ ...settings, mode: 'manual' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Manual Promotion Only</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Class teachers manually decide each student's promotion status.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={settings.mode === 'hybrid'}
                    onChange={() => setSettings({ ...settings, mode: 'hybrid' })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Hybrid (Automatic + Manual Review)</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Auto-promote eligible students, flag others for manual review.
                    </div>
                  </div>
                </label>
              </div>

              {settings.mode !== 'manual' && (
                <div className="pt-4 border-t">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.allowManualOverride}
                      onChange={(e) => setSettings({ ...settings, allowManualOverride: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Allow manual overrides for exceptions</span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'criteria' && settings.mode !== 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle>Automatic Promotion Criteria</CardTitle>
              <CardDescription>Define requirements for automatic promotion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pass Mark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pass Mark (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.criteria?.passMark || 40}
                  onChange={(e) => setSettings({
                    ...settings,
                    criteria: { ...settings.criteria!, passMark: Number(e.target.value) }
                  })}
                  className="max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum score to pass a subject</p>
              </div>

              {/* Minimum Average Score */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.criteria?.minimumAverageScore?.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      criteria: {
                        ...settings.criteria!,
                        minimumAverageScore: {
                          ...settings.criteria!.minimumAverageScore!,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Require minimum average score</span>
                </label>

                {settings.criteria?.minimumAverageScore?.enabled && (
                  <div className="ml-7">
                    <label className="block text-sm text-gray-700 mb-2">Minimum Average (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.criteria.minimumAverageScore.value}
                      onChange={(e) => setSettings({
                        ...settings,
                        criteria: {
                          ...settings.criteria!,
                          minimumAverageScore: {
                            ...settings.criteria!.minimumAverageScore!,
                            value: Number(e.target.value)
                          }
                        }
                      })}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Minimum Subjects Passed */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.criteria?.minimumSubjectsPassed?.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      criteria: {
                        ...settings.criteria!,
                        minimumSubjectsPassed: {
                          ...settings.criteria!.minimumSubjectsPassed!,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Require minimum subjects passed</span>
                </label>

                {settings.criteria?.minimumSubjectsPassed?.enabled && (
                  <div className="ml-7">
                    <label className="block text-sm text-gray-700 mb-2">Minimum Subjects</label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.criteria.minimumSubjectsPassed.value}
                      onChange={(e) => setSettings({
                        ...settings,
                        criteria: {
                          ...settings.criteria!,
                          minimumSubjectsPassed: {
                            ...settings.criteria!.minimumSubjectsPassed!,
                            value: Number(e.target.value)
                          }
                        }
                      })}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Attendance Requirement */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.criteria?.attendanceRequirement?.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      criteria: {
                        ...settings.criteria!,
                        attendanceRequirement: {
                          ...settings.criteria!.attendanceRequirement!,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Require minimum attendance</span>
                </label>

                {settings.criteria?.attendanceRequirement?.enabled && (
                  <div className="ml-7">
                    <label className="block text-sm text-gray-700 mb-2">Minimum Attendance (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.criteria.attendanceRequirement.minimumPercentage}
                      onChange={(e) => setSettings({
                        ...settings,
                        criteria: {
                          ...settings.criteria!,
                          attendanceRequirement: {
                            ...settings.criteria!.attendanceRequirement!,
                            minimumPercentage: Number(e.target.value)
                          }
                        }
                      })}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'mapping' && (
          <Card>
            <CardHeader>
              <CardTitle>Class Progression Mapping</CardTitle>
              <CardDescription>Define which class students move to after each level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                <p className="text-sm text-blue-800">
                  💡 This feature will be fully configured when you set up your class levels in Academic Settings.
                  For now, promotions will follow the natural class progression (JSS 1 → JSS 2, etc.).
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <p>Example progression:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>JSS 1 → JSS 2</li>
                  <li>JSS 2 → JSS 3</li>
                  <li>JSS 3 → SS 1</li>
                  <li>SS 1 → SS 2</li>
                  <li>SS 2 → SS 3</li>
                  <li>SS 3 → GRADUATED</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'graduation' && (
          <Card>
            <CardHeader>
              <CardTitle>Graduation Settings</CardTitle>
              <CardDescription>Configure requirements and post-graduation handling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Graduation Requirements */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Graduation Requirements</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.graduation.requirements.passAllCoreSubjects}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          requirements: {
                            ...settings.graduation.requirements,
                            passAllCoreSubjects: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Pass all core subjects in final year</span>
                  </label>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Minimum average score for graduation (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.graduation.requirements.minimumAverageScore || 50}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          requirements: {
                            ...settings.graduation.requirements,
                            minimumAverageScore: Number(e.target.value)
                          }
                        }
                      })}
                      className="max-w-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Minimum attendance for graduation (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.graduation.requirements.minimumAttendance || 75}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          requirements: {
                            ...settings.graduation.requirements,
                            minimumAttendance: Number(e.target.value)
                          }
                        }
                      })}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Post-Graduation */}
              <div className="pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Post-Graduation Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.graduation.postGraduation.keepRecords}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          postGraduation: {
                            ...settings.graduation.postGraduation,
                            keepRecords: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Keep academic records indefinitely</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.graduation.postGraduation.generateCertificate}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          postGraduation: {
                            ...settings.graduation.postGraduation,
                            generateCertificate: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Generate graduation certificates</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.graduation.postGraduation.generateTranscript}
                      onChange={(e) => setSettings({
                        ...settings,
                        graduation: {
                          ...settings.graduation,
                          postGraduation: {
                            ...settings.graduation.postGraduation,
                            generateTranscript: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Generate final transcripts</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'workflow' && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow & Permissions</CardTitle>
              <CardDescription>Control who can promote students and approval process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Permissions</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.workflow.teachersCanPromote}
                      onChange={(e) => setSettings({
                        ...settings,
                        workflow: {
                          ...settings.workflow,
                          teachersCanPromote: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Class teachers can submit promotions for their class</span>
                  </label>
                </div>
              </div>

              {settings.workflow.teachersCanPromote && (
                <div className="pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Approval Workflow</h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={!settings.workflow.requireApproval}
                        onChange={() => setSettings({
                          ...settings,
                          workflow: {
                            ...settings.workflow,
                            requireApproval: false
                          }
                        })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">No approval required</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Teachers can execute promotions directly (not recommended)
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={settings.workflow.requireApproval}
                        onChange={() => setSettings({
                          ...settings,
                          workflow: {
                            ...settings.workflow,
                            requireApproval: true
                          }
                        })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Teacher submits → Admin approves</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Teachers submit decisions, admin reviews and executes (recommended)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailParents}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          emailParents: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Email parents after promotion</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.notifications.notifyAdmins}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          notifyAdmins: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Notify admins when teacher submits promotion</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/settings')}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
