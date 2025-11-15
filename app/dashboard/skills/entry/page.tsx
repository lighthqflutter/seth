'use client';

/**
 * Skills/Conduct Entry Page (Phase 19)
 * Teachers enter behavioral, social, and psychomotor skill ratings for students
 *
 * Features:
 * - Select class and term
 * - Table format similar to score entry
 * - Dropdown for each skill rating
 * - Save per student or bulk save
 * - View existing ratings
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, writeBatch, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logAudit } from '@/lib/auditLogger';
import {
  DEFAULT_SKILLS,
  SkillRating,
  StudentSkillRating,
  SCALE_DEFINITIONS,
  getSkillCategoryLabel,
  validateSkillRating,
} from '@/lib/skillsConfig';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
  academicYear: string;
}

interface SkillEntryData {
  [studentId: string]: {
    [skillId: string]: string; // Rating value
  };
}

export default function SkillsEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(searchParams.get('classId') || '');
  const [selectedTermId, setSelectedTermId] = useState<string>(searchParams.get('termId') || '');
  const [skillRatings, setSkillRatings] = useState<SkillEntryData>({});
  const [existingRatings, setExistingRatings] = useState<StudentSkillRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use default skills (future: fetch from tenant configuration)
  const skills = DEFAULT_SKILLS;

  // Group skills by category
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillRating[]>);

  // Load classes and terms
  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ClassInfo[];
        setClasses(classesData);

        // Load terms
        const termsQuery = query(
          collection(db, 'terms'),
          where('tenantId', '==', user.tenantId)
        );
        const termsSnapshot = await getDocs(termsQuery);
        const termsData = termsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Term[];
        setTerms(termsData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  // Load students and existing ratings when class/term selected
  useEffect(() => {
    const loadStudentsAndRatings = async () => {
      if (!user?.tenantId || !selectedClassId || !selectedTermId) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        // Load students in class
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', selectedClassId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];
        setStudents(studentsData);

        // Load existing skill ratings for this class/term
        const ratingsQuery = query(
          collection(db, 'skillRatings'),
          where('tenantId', '==', user.tenantId),
          where('termId', '==', selectedTermId)
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);
        const ratingsData = ratingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as StudentSkillRating[];

        // Filter ratings for students in this class
        const studentIds = studentsData.map(s => s.id);
        const filteredRatings = ratingsData.filter(r => studentIds.includes(r.studentId));
        setExistingRatings(filteredRatings);

        // Initialize skill ratings with existing data
        const initialRatings: SkillEntryData = {};
        studentsData.forEach(student => {
          initialRatings[student.id] = {};
          skills.forEach(skill => {
            const existing = filteredRatings.find(
              r => r.studentId === student.id && r.skillId === skill.id
            );
            initialRatings[student.id][skill.id] = existing?.rating || '';
          });
        });
        setSkillRatings(initialRatings);

        setLoading(false);
      } catch (error) {
        console.error('Error loading students and ratings:', error);
        setLoading(false);
      }
    };

    loadStudentsAndRatings();
  }, [user?.tenantId, selectedClassId, selectedTermId]);

  const handleRatingChange = (studentId: string, skillId: string, value: string) => {
    setSkillRatings(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [skillId]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedClassId || !selectedTermId) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Process each student's ratings
      for (const student of students) {
        for (const skill of skills) {
          const rating = skillRatings[student.id]?.[skill.id];

          // Skip if no rating entered
          if (!rating) continue;

          // Validate rating
          if (!validateSkillRating(rating, skill.scale)) {
            throw new Error(`Invalid rating "${rating}" for ${skill.name}`);
          }

          // Check if rating already exists
          const existingRating = existingRatings.find(
            r => r.studentId === student.id && r.skillId === skill.id
          );

          if (existingRating) {
            // Update existing rating
            const ratingRef = doc(db, 'skillRatings', existingRating.id);
            batch.update(ratingRef, {
              rating,
              ratedBy: user.uid,
              ratedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            updateCount++;
          } else {
            // Create new rating
            const ratingRef = doc(collection(db, 'skillRatings'));
            batch.set(ratingRef, {
              studentId: student.id,
              termId: selectedTermId,
              tenantId: user.tenantId,
              skillId: skill.id,
              rating,
              ratedBy: user.uid,
              ratedAt: Timestamp.now(),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            updateCount++;
          }
        }
      }

      // Commit batch
      await batch.commit();

      // Audit log
      await logAudit({
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        action: 'create',
        entityType: 'result',
        entityId: `class-${selectedClassId}-term-${selectedTermId}`,
        entityName: `Skills for ${classes.find(c => c.id === selectedClassId)?.name} - ${terms.find(t => t.id === selectedTermId)?.name}`,
        metadata: {
          classId: selectedClassId,
          termId: selectedTermId,
          studentCount: students.length,
          ratingsUpdated: updateCount,
          type: 'skillRatings',
        },
      });

      setSaveSuccess(true);
      alert(`Successfully saved ${updateCount} skill ratings!`);

      // Reload ratings
      const ratingsQuery = query(
        collection(db, 'skillRatings'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTermId)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratingsData = ratingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentSkillRating[];
      const studentIds = students.map(s => s.id);
      setExistingRatings(ratingsData.filter(r => studentIds.includes(r.studentId)));

      setSaving(false);
    } catch (error: any) {
      console.error('Error saving skill ratings:', error);
      setSaveError(error.message || 'Failed to save skill ratings');
      setSaving(false);
    }
  };

  if (loading && !selectedClassId && !selectedTermId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Skills & Conduct Entry</h1>
        <p className="text-gray-600 mt-1">Rate students on behavioral, social, and psychomotor skills</p>
      </div>

      {/* Class and Term Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Term</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academicYear}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Entry Table */}
      {selectedClassId && selectedTermId && students.length > 0 && (
        <>
          {saveError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error Saving Ratings</p>
                <p className="text-red-700 text-sm mt-1">{saveError}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <p className="text-green-800">Skill ratings saved successfully!</p>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Rate Skills for {students.length} Students
                </h2>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save All Ratings'}
                </Button>
              </div>

              <div className="overflow-x-auto">
                {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                  <div key={category} className="mb-8">
                    <h3 className="text-md font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                      {getSkillCategoryLabel(category as any)}
                    </h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Student
                          </th>
                          {categorySkills.map(skill => (
                            <th
                              key={skill.id}
                              className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                              title={skill.description}
                            >
                              {skill.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                              <div>
                                <div>{student.firstName} {student.lastName}</div>
                                <div className="text-xs text-gray-500">{student.admissionNumber}</div>
                              </div>
                            </td>
                            {categorySkills.map(skill => (
                              <td key={skill.id} className="px-4 py-3 text-center">
                                <select
                                  value={skillRatings[student.id]?.[skill.id] || ''}
                                  onChange={(e) => handleRatingChange(student.id, skill.id, e.target.value)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-</option>
                                  {SCALE_DEFINITIONS[skill.scale].map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.value}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                >
                  {saving ? 'Saving...' : 'Save All Ratings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {selectedClassId && selectedTermId && students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No active students found in this class.</p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedClassId || !selectedTermId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Select a class and term to begin entering skill ratings</p>
            <div className="text-sm text-gray-500 space-y-2">
              <p>Rating Scale: 1 (Poor) to 5 (Excellent)</p>
              <p>Skills are grouped by: Behavioral, Social, and Psychomotor categories</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
