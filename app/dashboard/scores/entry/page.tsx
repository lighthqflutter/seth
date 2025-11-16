'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { calculateTotalScore, calculateGrade, validateScoreEntry } from '@/lib/scoreCalculation';
import { AssessmentConfig, GradingConfig } from '@/types';
import { logAudit } from '@/lib/auditLogger';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface StudentScore {
  studentId: string;
  assessmentScores: { [key: string]: number | null };
  isAbsent: boolean;
  total?: number;
  grade?: string;
  errors?: string[];
}

export default function ScoreEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const classId = searchParams?.get('classId');
  const subjectId = searchParams?.get('subjectId');
  const termId = searchParams?.get('termId');

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Map<string, StudentScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Default assessment config
  const defaultAssessmentConfig: AssessmentConfig = {
    numberOfCAs: 3,
    caConfigs: [
      { name: 'CA1', maxScore: 10, isOptional: false },
      { name: 'CA2', maxScore: 10, isOptional: false },
      { name: 'CA3', maxScore: 10, isOptional: false },
    ],
    exam: { enabled: true, name: 'Exam', maxScore: 70 },
    project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
    calculationMethod: 'sum',
    totalMaxScore: 100,
  };

  // Active assessment config based on selection
  const [assessmentConfig, setAssessmentConfig] = useState<AssessmentConfig>(defaultAssessmentConfig);

  const gradingConfig: GradingConfig = {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A1', minScore: 75, maxScore: 100, description: 'Excellent' },
      { grade: 'B2', minScore: 70, maxScore: 74, description: 'Very Good' },
      { grade: 'C4', minScore: 60, maxScore: 69, description: 'Good' },
      { grade: 'C6', minScore: 50, maxScore: 59, description: 'Credit' },
      { grade: 'D7', minScore: 45, maxScore: 49, description: 'Pass' },
      { grade: 'E8', minScore: 40, maxScore: 44, description: 'Pass' },
      { grade: 'F9', minScore: 0, maxScore: 39, description: 'Fail' },
    ],
    passMark: 40,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: true,
      showRemark: true,
    },
  };

  // Load configurations
  useEffect(() => {
    const loadConfigurations = async () => {
      if (!user?.tenantId) return;

      try {
        const configurationsQuery = query(
          collection(db, 'scoreConfigurations'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(configurationsQuery);
        const configsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setConfigurations(configsData);

        // Auto-select first active config or use default
        if (configsData.length > 0) {
          const firstConfig = configsData[0];
          setSelectedConfigId(firstConfig.id);
          setAssessmentConfig(firstConfig.assessmentConfig);
        }

        setLoadingConfigs(false);
      } catch (error) {
        console.error('Error loading configurations:', error);
        setLoadingConfigs(false);
      }
    };

    loadConfigurations();
  }, [user?.tenantId]);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.tenantId || !classId) return;

      try {
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', classId),
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(studentsQuery);
        const studentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];

        setStudents(studentsData);

        // Initialize scores map
        const scoresMap = new Map<string, StudentScore>();
        studentsData.forEach(student => {
          scoresMap.set(student.id, {
            studentId: student.id,
            assessmentScores: {},
            isAbsent: false,
          });
        });
        setScores(scoresMap);

        setLoading(false);
      } catch (error) {
        console.error('Error loading students:', error);
        setLoading(false);
      }
    };

    loadStudents();
  }, [user?.tenantId, classId]);

  // Handle configuration change
  const handleConfigurationChange = (configId: string) => {
    setSelectedConfigId(configId);

    if (configId === 'default') {
      setAssessmentConfig(defaultAssessmentConfig);
    } else {
      const selected = configurations.find(c => c.id === configId);
      if (selected) {
        setAssessmentConfig(selected.assessmentConfig);
      }
    }

    // Reset scores when changing configuration
    const scoresMap = new Map<string, StudentScore>();
    students.forEach(student => {
      scoresMap.set(student.id, {
        studentId: student.id,
        assessmentScores: {},
        isAbsent: false,
      });
    });
    setScores(scoresMap);
  };

  const handleScoreChange = (studentId: string, assessmentKey: string, value: string) => {
    const scoresMap = new Map(scores);
    const studentScore = scoresMap.get(studentId);

    if (!studentScore) return;

    // Parse value
    const numValue = value === '' ? null : parseFloat(value);

    // Update score
    studentScore.assessmentScores[assessmentKey] = numValue;

    // Validate
    const validation = validateScoreEntry({ assessmentScores: studentScore.assessmentScores }, assessmentConfig);
    studentScore.errors = validation.errors;

    // Calculate total and grade if valid
    if (validation.valid && !studentScore.isAbsent) {
      const result = calculateTotalScore({ assessmentScores: studentScore.assessmentScores }, assessmentConfig);
      studentScore.total = result.total;
      studentScore.grade = calculateGrade(result.percentage, gradingConfig);
    } else {
      studentScore.total = undefined;
      studentScore.grade = undefined;
    }

    scoresMap.set(studentId, studentScore);
    setScores(scoresMap);
  };

  const handleAbsentToggle = (studentId: string) => {
    const scoresMap = new Map(scores);
    const studentScore = scoresMap.get(studentId);

    if (!studentScore) return;

    studentScore.isAbsent = !studentScore.isAbsent;

    // Clear scores if marking absent
    if (studentScore.isAbsent) {
      studentScore.assessmentScores = {};
      studentScore.total = undefined;
      studentScore.grade = undefined;
      studentScore.errors = [];
    }

    scoresMap.set(studentId, studentScore);
    setScores(scoresMap);
  };

  // CSV Template Download
  const handleDownloadTemplate = () => {
    // Create CSV header based on current configuration
    const headers = [
      'Student Name',
      'Admission Number',
      ...assessmentConfig.caConfigs.map(ca => ca.name),
    ];

    if (assessmentConfig.exam.enabled) {
      headers.push(assessmentConfig.exam.name);
    }

    headers.push('Is Absent (Yes/No)');

    // Add student rows
    const rows = students.map(student => {
      const row = [
        `${student.firstName} ${student.lastName}`,
        student.admissionNumber,
        ...assessmentConfig.caConfigs.map(() => ''),
      ];

      if (assessmentConfig.exam.enabled) {
        row.push('');
      }

      row.push('No');

      return row;
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `score_template_${classId}_${subjectId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim());

      // Validate headers match configuration
      const expectedHeaders = [
        'Student Name',
        'Admission Number',
        ...assessmentConfig.caConfigs.map(ca => ca.name),
      ];

      if (assessmentConfig.exam.enabled) {
        expectedHeaders.push(assessmentConfig.exam.name);
      }

      expectedHeaders.push('Is Absent (Yes/No)');

      const headersMatch = expectedHeaders.every((expected, index) => {
        return headers[index] === expected;
      });

      if (!headersMatch) {
        alert('CSV headers do not match the current configuration. Please download the latest template.');
        return;
      }

      // Parse data rows
      const scoresMap = new Map(scores);
      let importCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        if (values.length < expectedHeaders.length) continue;

        const admissionNumber = values[1];
        const student = students.find(s => s.admissionNumber === admissionNumber);

        if (!student) {
          console.warn(`Student not found: ${admissionNumber}`);
          errorCount++;
          continue;
        }

        const studentScore = scoresMap.get(student.id);
        if (!studentScore) continue;

        // Parse scores
        let columnIndex = 2; // Start after name and admission number
        const assessmentScores: { [key: string]: number | null } = {};

        for (const ca of assessmentConfig.caConfigs) {
          const key = ca.name.toLowerCase().replace(/\s+/g, '-');
          const value = values[columnIndex];
          assessmentScores[key] = value && value !== '' ? parseFloat(value) : null;
          columnIndex++;
        }

        if (assessmentConfig.exam.enabled) {
          const examValue = values[columnIndex];
          assessmentScores['exam'] = examValue && examValue !== '' ? parseFloat(examValue) : null;
          columnIndex++;
        }

        // Parse absent status
        const isAbsent = values[columnIndex]?.toLowerCase() === 'yes';

        studentScore.assessmentScores = assessmentScores;
        studentScore.isAbsent = isAbsent;

        // Validate and calculate
        if (!isAbsent) {
          const validation = validateScoreEntry({ assessmentScores }, assessmentConfig);
          studentScore.errors = validation.errors;

          if (validation.valid) {
            const result = calculateTotalScore({ assessmentScores }, assessmentConfig);
            studentScore.total = result.total;
            studentScore.grade = calculateGrade(result.percentage, gradingConfig);
          }
        }

        scoresMap.set(student.id, studentScore);
        importCount++;
      }

      setScores(scoresMap);
      alert(`Import complete! Successfully imported ${importCount} student records.${errorCount > 0 ? ` ${errorCount} errors.` : ''}`);
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleSave = async (isDraft: boolean) => {
    if (!user?.tenantId || !classId || !subjectId || !termId) return;

    setSaving(true);

    try {
      const scoresCollection = collection(db, 'scores');

      for (const [studentId, studentScore] of scores) {
        // Skip if no data entered
        if (Object.keys(studentScore.assessmentScores).length === 0 && !studentScore.isAbsent) {
          continue;
        }

        // Calculate final values
        let total = 0;
        let percentage = 0;
        let grade = '';

        if (!studentScore.isAbsent && studentScore.total !== undefined) {
          const result = calculateTotalScore({ assessmentScores: studentScore.assessmentScores }, assessmentConfig);
          total = result.total;
          percentage = result.percentage;
          grade = calculateGrade(percentage, gradingConfig);
        }

        const scoreData = {
          tenantId: user.tenantId,
          studentId,
          subjectId,
          classId,
          termId,
          teacherId: user.uid,
          assessmentScores: studentScore.assessmentScores,
          total,
          percentage,
          grade,
          isAbsent: studentScore.isAbsent,
          isExempted: false,
          isDraft,
          isSubmitted: !isDraft,
          isPublished: !isDraft,
          isLocked: false,
          publishedAt: !isDraft ? Timestamp.now() : null,
          submittedAt: !isDraft ? Timestamp.now() : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(scoresCollection, scoreData);
      }

      // Audit log: Scores published/saved
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: isDraft ? 'save_draft' : 'publish_scores',
          entityType: 'score',
          entityId: 'bulk',
          metadata: {
            classId,
            subjectId,
            termId,
            studentCount: scores.size,
            isDraft,
            timestamp: new Date().toISOString(),
          },
        });
      }

      alert(`Scores ${isDraft ? 'saved as draft' : 'published'} successfully!`);
      router.push('/dashboard/scores');
    } catch (error: any) {
      console.error('Error saving scores:', error);

      // Audit log: Failed to save scores
      if (user) {
        await logAudit({
          user: {
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          },
          action: isDraft ? 'save_draft' : 'publish_scores',
          entityType: 'score',
          entityId: 'bulk',
          success: false,
          errorMessage: error.message || 'Failed to save scores',
          metadata: {
            classId,
            subjectId,
            termId,
          },
        });
      }

      alert('Failed to save scores. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
            <p className="text-gray-600 mb-4">There are no active students in this class.</p>
            <Button onClick={() => router.push('/dashboard/scores')}>Back to Scores</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Score Entry</h1>
        <p className="text-gray-600 mt-1">Enter scores for all students</p>
      </div>

      {/* Configuration Selector */}
      {!loadingConfigs && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-fit">
                Score Configuration:
              </label>
              <select
                className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedConfigId}
                onChange={(e) => handleConfigurationChange(e.target.value)}
              >
                <option value="default">Default (CA1, CA2, CA3, Exam)</option>
                {configurations.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} - Total: {config.assessmentConfig.totalMaxScore}
                  </option>
                ))}
              </select>
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/scores/configurations')}
                >
                  Manage
                </Button>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <strong>Components:</strong>{' '}
              {assessmentConfig.caConfigs.map(ca => `${ca.name} (${ca.maxScore})`).join(', ')}
              {assessmentConfig.exam.enabled && `, ${assessmentConfig.exam.name} (${assessmentConfig.exam.maxScore})`}
              {' '}= Total: {assessmentConfig.totalMaxScore}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  {assessmentConfig.caConfigs.map(ca => (
                    <th key={ca.name} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {ca.name} <br />
                      <span className="text-gray-400">({ca.maxScore})</span>
                    </th>
                  ))}
                  {assessmentConfig.exam.enabled && (
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {assessmentConfig.exam.name} <br />
                      <span className="text-gray-400">({assessmentConfig.exam.maxScore})</span>
                    </th>
                  )}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Absent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map(student => {
                  const studentScore = scores.get(student.id);
                  if (!studentScore) return null;

                  return (
                    <tr key={student.id}>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{student.admissionNumber}</div>
                        </div>
                      </td>

                      {assessmentConfig.caConfigs.map(ca => {
                        const key = ca.name.toLowerCase().replace(/\s+/g, '-');
                        return (
                          <td key={ca.name} className="px-3 py-4">
                            <Input
                              type="number"
                              min="0"
                              max={ca.maxScore}
                              step="0.5"
                              value={studentScore.assessmentScores[key] ?? ''}
                              onChange={(e) => handleScoreChange(student.id, key, e.target.value)}
                              disabled={studentScore.isAbsent}
                              className="w-20"
                              aria-label={`${ca.name} for ${student.firstName} ${student.lastName}`}
                            />
                          </td>
                        );
                      })}

                      {assessmentConfig.exam.enabled && (
                        <td className="px-3 py-4">
                          <Input
                            type="number"
                            min="0"
                            max={assessmentConfig.exam.maxScore}
                            step="0.5"
                            value={studentScore.assessmentScores['exam'] ?? ''}
                            onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                            disabled={studentScore.isAbsent}
                            className="w-20"
                            aria-label={`Exam for ${student.firstName} ${student.lastName}`}
                          />
                        </td>
                      )}

                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {studentScore.total !== undefined ? studentScore.total.toFixed(1) : '-'}
                        </span>
                      </td>

                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                          studentScore.grade && studentScore.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                          studentScore.grade && studentScore.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                          studentScore.grade && studentScore.grade.startsWith('F') ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {studentScore.grade || '-'}
                        </span>
                      </td>

                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={studentScore.isAbsent}
                          onChange={() => handleAbsentToggle(student.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`Mark ${student.firstName} ${student.lastName} as absent`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show validation errors if any */}
          {Array.from(scores.values()).some(s => s.errors && s.errors.length > 0) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600">
                {Array.from(scores.values()).map(s =>
                  s.errors?.map((error, i) => <li key={i}>{error}</li>)
                )}
              </ul>
            </div>
          )}

          {/* CSV Import/Export Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Bulk Import/Export</h3>
            <div className="flex gap-3 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                Download CSV Template
              </Button>
              <div className="flex items-center gap-2">
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  Import from CSV
                </Button>
              </div>
              <span className="text-xs text-gray-500">
                Download template, fill in scores, then import back
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              variant="outline"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={saving || Array.from(scores.values()).some(s => s.errors && s.errors.length > 0)}
            >
              {saving ? 'Publishing...' : 'Publish Scores'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/scores')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
