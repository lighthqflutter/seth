'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AssessmentConfig, CAConfig } from '@/types';

interface ScoreConfiguration {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  assessmentConfig: AssessmentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export default function ScoreConfigurationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState<ScoreConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [useDefault, setUseDefault] = useState(true);
  const [components, setComponents] = useState<CAConfig[]>([]);
  const [examScore, setExamScore] = useState(70);
  const [examEnabled, setExamEnabled] = useState(true);

  useEffect(() => {
    loadConfigurations();
  }, [user?.tenantId]);

  const loadConfigurations = async () => {
    if (!user?.tenantId) return;

    try {
      const configurationsQuery = query(
        collection(db, 'scoreConfigurations'),
        where('tenantId', '==', user.tenantId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(configurationsQuery);
      const configsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ScoreConfiguration[];
      setConfigurations(configsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading configurations:', error);
      setLoading(false);
    }
  };

  const initializeDefaultComponents = () => {
    setComponents([
      { name: 'CA1', maxScore: 10, isOptional: false },
      { name: 'CA2', maxScore: 10, isOptional: false },
      { name: 'CA3', maxScore: 10, isOptional: false },
    ]);
    setExamScore(70);
    setExamEnabled(true);
  };

  const handleNewConfiguration = () => {
    setShowForm(true);
    setEditingId(null);
    setConfigName('');
    setConfigDescription('');
    setUseDefault(true);
    initializeDefaultComponents();
  };

  const handleEditConfiguration = (config: ScoreConfiguration) => {
    setShowForm(true);
    setEditingId(config.id);
    setConfigName(config.name);
    setConfigDescription(config.description || '');
    setUseDefault(config.isDefault);
    setComponents(config.assessmentConfig.caConfigs);
    setExamScore(config.assessmentConfig.exam.maxScore);
    setExamEnabled(config.assessmentConfig.exam.enabled);
  };

  const addComponent = () => {
    setComponents([...components, { name: '', maxScore: 10, isOptional: false }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof CAConfig, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  const calculateTotal = () => {
    const caTotal = components.reduce((sum, comp) => sum + (comp.maxScore || 0), 0);
    const examTotal = examEnabled ? examScore : 0;
    return caTotal + examTotal;
  };

  const handleSave = async () => {
    if (!user?.tenantId) return;

    // Validation
    if (!configName.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    if (!useDefault && components.length === 0) {
      alert('Please add at least one assessment component');
      return;
    }

    if (!useDefault) {
      for (const comp of components) {
        if (!comp.name.trim()) {
          alert('All components must have a name');
          return;
        }
        if (comp.maxScore <= 0) {
          alert('All components must have a score greater than 0');
          return;
        }
      }
    }

    const totalScore = calculateTotal();

    const assessmentConfig: AssessmentConfig = {
      numberOfCAs: components.length,
      caConfigs: components,
      exam: {
        enabled: examEnabled,
        name: 'Exam',
        maxScore: examScore,
      },
      project: {
        enabled: false,
        name: 'Project',
        maxScore: 0,
        isOptional: true,
      },
      calculationMethod: 'sum',
      totalMaxScore: totalScore,
    };

    const configData = {
      tenantId: user.tenantId,
      name: configName.trim(),
      description: configDescription.trim() || undefined,
      isDefault: useDefault,
      isActive: true,
      assessmentConfig,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'scoreConfigurations', editingId), configData);
      } else {
        // Create new
        await addDoc(collection(db, 'scoreConfigurations'), {
          ...configData,
          createdAt: Timestamp.now(),
        });
      }

      alert(`Configuration ${editingId ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      loadConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await deleteDoc(doc(db, 'scoreConfigurations', id));
      alert('Configuration deleted successfully!');
      loadConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('Failed to delete configuration. Please try again.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'scoreConfigurations', id), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now(),
      });
      loadConfigurations();
    } catch (error) {
      console.error('Error toggling configuration:', error);
      alert('Failed to update configuration status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Edit' : 'New'} Score Configuration
          </h1>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Back to List
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration Name *
              </label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Standard Configuration, JSS Configuration"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Input
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                placeholder="Brief description of this configuration"
              />
            </div>

            {/* Default or Custom */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Configuration Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={useDefault}
                    onChange={() => {
                      setUseDefault(true);
                      initializeDefaultComponents();
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    Use Default (CA1: 10, CA2: 10, CA3: 10, Exam: 70)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!useDefault}
                    onChange={() => {
                      setUseDefault(false);
                      setComponents([]);
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    Custom Configuration (Build your own)
                  </span>
                </label>
              </div>
            </div>

            {/* Custom Components */}
            {!useDefault && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Assessment Components
                  </label>
                  <Button type="button" size="sm" onClick={addComponent}>
                    + Add Component
                  </Button>
                </div>

                {components.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    No components added. Click "Add Component" to create assessment components like CA1, Quiz, Project, etc.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {components.map((comp, index) => (
                      <div key={index} className="flex gap-3 items-start p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <Input
                            placeholder="Component name (e.g., CA1, Quiz, Project)"
                            value={comp.name}
                            onChange={(e) => updateComponent(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Max score"
                            value={comp.maxScore}
                            onChange={(e) => updateComponent(index, 'maxScore', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={comp.isOptional}
                              onChange={(e) => updateComponent(index, 'isOptional', e.target.checked)}
                              className="mr-1"
                            />
                            Optional
                          </label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeComponent(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Exam Configuration */}
            <div className="space-y-3 border-t pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={examEnabled}
                  onChange={(e) => setExamEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include Exam
                </span>
              </label>
              {examEnabled && (
                <div className="ml-6">
                  <label className="block text-sm text-gray-600 mb-2">Exam Max Score</label>
                  <Input
                    type="number"
                    min="1"
                    value={examScore}
                    onChange={(e) => setExamScore(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              )}
            </div>

            {/* Total Score Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Total Max Score:</span>
                <span className="text-2xl font-bold text-blue-600">{calculateTotal()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave}>
                {editingId ? 'Update Configuration' : 'Save Configuration'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Score Configurations</h1>
          <p className="text-gray-600 mt-1">
            Manage score breakdown components for score entry
          </p>
        </div>
        <Button onClick={handleNewConfiguration}>+ New Configuration</Button>
      </div>

      {configurations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Configurations Found</h3>
            <p className="text-gray-600 mb-4">
              Create a configuration to define how scores are broken down (CA1, CA2, Exam, etc.)
            </p>
            <Button onClick={handleNewConfiguration}>Create First Configuration</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configurations.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.name}
                      {config.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                      {config.isActive && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                      {!config.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </CardTitle>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditConfiguration(config)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(config.id, config.isActive)}
                    >
                      {config.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(config.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {config.assessmentConfig.caConfigs.map((ca, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {ca.name}: {ca.maxScore} {ca.isOptional && '(Optional)'}
                      </span>
                    ))}
                    {config.assessmentConfig.exam.enabled && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                        Exam: {config.assessmentConfig.exam.maxScore}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Total Max Score:</strong> {config.assessmentConfig.totalMaxScore}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">About Score Configurations</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Create configurations to define how scores are broken down</li>
            <li>Default configuration: CA1 (10) + CA2 (10) + CA3 (10) + Exam (70) = 100</li>
            <li>Custom: Add any number of components (Quiz, Project, Assignment, etc.)</li>
            <li>Active configurations will be available during score entry</li>
            <li>You can have multiple configurations for different classes or terms</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
