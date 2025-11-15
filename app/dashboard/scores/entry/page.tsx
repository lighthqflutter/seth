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

  // Mock assessment config - in real app, fetch from tenant settings
  const assessmentConfig: AssessmentConfig = {
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
