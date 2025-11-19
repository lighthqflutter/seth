'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { PromotionSettings } from '@/types';
import { analyzeEligibility, StudentPerformance } from '@/lib/promotion/eligibilityAnalyzer';

interface PromotionSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  campaignId: string;
  campaignName: string;
  userId: string;
  userName: string;
  tenantId: string;
}

interface StudentDecision extends StudentPerformance {
  decision: 'promote' | 'repeat' | 'graduate' | null;
  overrideReason?: string;
  teacherNotes?: string;
}

export default function PromotionSubmissionModal({
  isOpen,
  onClose,
  classId,
  className,
  campaignId,
  campaignName,
  userId,
  userName,
  tenantId,
}: PromotionSubmissionModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'analyze' | 'review' | 'confirm'>('analyze');

  const [students, setStudents] = useState<StudentDecision[]>([]);
  const [settings, setSettings] = useState<PromotionSettings | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<'all' | 'promote' | 'review' | 'repeat'>('all');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load promotion settings
      const tenantDoc = await getDocs(query(collection(db, 'tenants'), where('__name__', '==', tenantId)));
      let promotionSettings: PromotionSettings | null = null;
      let coreSubjectIds: string[] = [];
      let passMark = 50;

      if (!tenantDoc.empty) {
        const tenantData = tenantDoc.docs[0].data();
        promotionSettings = tenantData.settings?.promotion || null;
        coreSubjectIds = promotionSettings?.criteria?.coreSubjectsRequirement?.coreSubjectIds || [];
        passMark = promotionSettings?.criteria?.passMark || 50;
        setSettings(promotionSettings);
      }

      // Load students in this class
      const studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', tenantId),
        where('currentClassId', '==', classId),
        where('isActive', '==', true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      // Load scores for each student
      const studentDecisions: StudentDecision[] = [];

      for (const studentDoc of studentsSnapshot.docs) {
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;
        const studentName = `${studentData.firstName} ${studentData.lastName}`;
        const admissionNumber = studentData.admissionNumber;

        // Query scores for this student
        const scoresQuery = query(
          collection(db, 'scores'),
          where('tenantId', '==', tenantId),
          where('studentId', '==', studentId)
        );
        const scoresSnapshot = await getDocs(scoresQuery);

        // Calculate performance metrics
        let totalScore = 0;
        let totalSubjects = 0;
        let subjectsPassed = 0;
        const failedSubjects: string[] = [];
        const failedCoreSubjects: string[] = [];

        scoresSnapshot.docs.forEach(scoreDoc => {
          const scoreData = scoreDoc.data();
          const score = scoreData.score || 0;
          const subjectName = scoreData.subjectName || 'Unknown Subject';
          const subjectId = scoreData.subjectId || '';

          totalScore += score;
          totalSubjects++;

          if (score >= passMark) {
            subjectsPassed++;
          } else {
            failedSubjects.push(subjectName);
            if (coreSubjectIds.includes(subjectId)) {
              failedCoreSubjects.push(subjectName);
            }
          }
        });

        const averageScore = totalSubjects > 0 ? Math.round(totalScore / totalSubjects) : 0;
        const subjectsFailed = totalSubjects - subjectsPassed;

        // Calculate attendance (placeholder - you may have a separate attendance collection)
        const attendance = studentData.attendance || 100;

        studentDecisions.push({
          studentId,
          studentName,
          admissionNumber,
          averageScore,
          totalSubjects,
          subjectsPassed,
          subjectsFailed,
          failedSubjects,
          failedCoreSubjects,
          attendance,
          decision: null,
        });
      }

      setStudents(studentDecisions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleDecisionChange = (studentId: string, decision: StudentDecision['decision']) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, decision } : s
    ));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, teacherNotes: notes } : s
    ));
  };

  const handleOverrideReasonChange = (studentId: string, reason: string) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, overrideReason: reason } : s
    ));
  };

  const toggleExpanded = (studentId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!settings) return;

    // Validate all students have decisions
    const undecided = students.filter(s => !s.decision);
    if (undecided.length > 0) {
      alert(`Please make a decision for all students. ${undecided.length} student(s) pending.`);
      return;
    }

    if (!confirm(`Submit promotion decisions for ${students.length} students in ${className}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      // Create promotion records for each student
      const batch = students.map(student => {
        const eligibility = analyzeEligibility(
          student,
          settings,
          settings.criteria?.coreSubjectsRequirement?.coreSubjectIds || []
        );

        return addDoc(collection(db, 'promotion_records'), {
          tenantId,
          campaignId,
          studentId: student.studentId,
          studentName: student.studentName,
          admissionNumber: student.admissionNumber,
          fromClassId: classId,
          fromClassName: className,
          fromClassLevel: className.split(' ')[0], // Extract level from class name
          toClassId: '', // Will be set during execution
          toClassName: '', // Will be set during execution
          toClassLevel: '', // Will be set during execution
          decision: student.decision,
          eligibility: eligibility.isEligible ? 'auto_eligible' : 'manual_override',
          averageScore: student.averageScore,
          totalSubjects: student.totalSubjects,
          subjectsPassed: student.subjectsPassed,
          subjectsFailedList: student.failedSubjects,
          failedCoreSubjects: student.failedCoreSubjects,
          attendance: student.attendance,
          criteriaResults: eligibility.criteriaResults,
          teacherNotes: student.teacherNotes,
          overrideReason: student.overrideReason,
          status: 'submitted',
          submittedBy: userId,
          submittedByName: userName,
          submittedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      await Promise.all(batch);

      alert('Promotion decisions submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting decisions:', error);
      alert('Failed to submit decisions. Please try again.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categorized = {
    autoEligible: students.filter(s => {
      if (!settings) return false;
      const eligibility = analyzeEligibility(s, settings, settings.criteria?.coreSubjectsRequirement?.coreSubjectIds || []);
      return eligibility.category === 'auto_eligible';
    }),
    reviewRequired: students.filter(s => {
      if (!settings) return false;
      const eligibility = analyzeEligibility(s, settings, settings.criteria?.coreSubjectsRequirement?.coreSubjectIds || []);
      return eligibility.category === 'review_required' || eligibility.category === 'auto_ineligible';
    }),
  };

  const filteredStudents = filter === 'all' ? students :
    filter === 'promote' ? categorized.autoEligible :
    filter === 'review' ? categorized.reviewRequired :
    students.filter(s => s.decision === 'repeat');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submit Promotion Decisions</h2>
              <p className="text-sm text-gray-600 mt-1">{className} - {campaignName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing students...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="px-6 py-4 bg-blue-50 border-b">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-blue-700 mb-1">Auto Eligible</div>
                    <div className="text-2xl font-bold text-green-600">{categorized.autoEligible.length}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 mb-1">Review Required</div>
                    <div className="text-2xl font-bold text-yellow-600">{categorized.reviewRequired.length}</div>
                  </div>
                  <div>
                    <div className="text-blue-700 mb-1">Total Students</div>
                    <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                  </div>
                </div>
              </div>

              {/* Filter */}
              <div className="px-6 py-3 border-b flex gap-2">
                {[
                  { id: 'all', label: 'All Students', count: students.length },
                  { id: 'promote', label: 'Auto Eligible', count: categorized.autoEligible.length },
                  { id: 'review', label: 'Review Required', count: categorized.reviewRequired.length },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {filteredStudents.map(student => {
                    const eligibility = settings ? analyzeEligibility(
                      student,
                      settings,
                      settings.criteria?.coreSubjectsRequirement?.coreSubjectIds || []
                    ) : null;
                    const isExpanded = expandedStudents.has(student.studentId);

                    return (
                      <div key={student.studentId} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900">{student.studentName}</h3>
                              <span className="text-sm text-gray-500">({student.admissionNumber})</span>
                              {eligibility?.isEligible && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  ✓ Eligible
                                </span>
                              )}
                              {!eligibility?.isEligible && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  ⚠ Review
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-500">Average:</span>
                                <span className="ml-2 font-medium">{student.averageScore}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Passed:</span>
                                <span className="ml-2 font-medium">{student.subjectsPassed}/{student.totalSubjects}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Attendance:</span>
                                <span className="ml-2 font-medium">{student.attendance}%</span>
                              </div>
                            </div>

                            {eligibility && !eligibility.isEligible && (
                              <div className="mb-3">
                                <button
                                  onClick={() => toggleExpanded(student.studentId)}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                  {isExpanded ? 'Hide' : 'Show'} Details ({eligibility.failedCriteria.length} issues)
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 ml-6 space-y-1 text-sm">
                                    {eligibility.failedCriteria.map((criteria, idx) => (
                                      <div key={idx} className="text-red-600">❌ {criteria}</div>
                                    ))}
                                    {eligibility.passedCriteria.map((criteria, idx) => (
                                      <div key={idx} className="text-green-600">✓ {criteria}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex gap-3">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    checked={student.decision === 'promote'}
                                    onChange={() => handleDecisionChange(student.studentId, 'promote')}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  <span className="text-sm">Promote</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    checked={student.decision === 'repeat'}
                                    onChange={() => handleDecisionChange(student.studentId, 'repeat')}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  <span className="text-sm">Repeat</span>
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    checked={student.decision === 'graduate'}
                                    onChange={() => handleDecisionChange(student.studentId, 'graduate')}
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  <span className="text-sm">Graduate</span>
                                </label>
                              </div>

                              {student.decision && !eligibility?.isEligible && student.decision === 'promote' && (
                                <Input
                                  placeholder="Override reason (required)"
                                  value={student.overrideReason || ''}
                                  onChange={(e) => handleOverrideReasonChange(student.studentId, e.target.value)}
                                  className="text-sm"
                                />
                              )}

                              <Input
                                placeholder="Optional notes"
                                value={student.teacherNotes || ''}
                                onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit to Admin'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
