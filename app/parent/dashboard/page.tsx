'use client';

/**
 * Parent/Guardian Dashboard (Phase 16 + Phase 20 Enhancement)
 * Secure portal for parents to view their children's academic progress
 *
 * Features:
 * - List all linked children
 * - Quick stats for each child (average, position, attendance)
 * - Recent published results
 * - Access to detailed results
 * - Family academic summary (Phase 20)
 * - Bulk PDF downloads for all children (Phase 20)
 * - Guardian profile information (Phase 20)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SubjectScore, calculateTermResult } from '@/lib/resultCalculation';
import {
  AcademicCapIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  photoUrl?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
}

interface LatestResult {
  termName: string;
  averageScore: number;
  position?: number;
  totalSubjects: number;
}

interface ChildSummary {
  student: Student;
  classInfo: ClassInfo | null;
  latestResult: LatestResult | null;
}

interface GuardianInfo {
  name: string;
  email: string;
  phone: string;
  phone2?: string;
  address?: string;
  occupation?: string;
  relationshipType: 'father' | 'mother' | 'legal_guardian' | 'other';
  isPrimary: boolean;
  isEmergencyContact: boolean;
}

export default function ParentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [guardianInfo, setGuardianInfo] = useState<GuardianInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    const loadChildren = async () => {
      if (!user?.tenantId || !user?.uid) return;

      // Redirect non-parents
      if (user.role !== 'parent') {
        router.push('/dashboard');
        return;
      }

      try {
        // Load guardian information
        const guardianDoc = await getDoc(doc(db, 'users', user.uid));
        if (guardianDoc.exists()) {
          const gData = guardianDoc.data();
          setGuardianInfo({
            name: gData.name || '',
            email: gData.email || '',
            phone: gData.phone || '',
            phone2: gData.phone2,
            address: gData.address,
            occupation: gData.occupation,
            relationshipType: gData.relationshipType || 'other',
            isPrimary: gData.isPrimary || false,
            isEmergencyContact: gData.isEmergencyContact || false,
          });
        }

        // Load students where guardianIds includes current user's uid
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('guardianIds', 'array-contains', user.uid),
          where('isActive', '==', true)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Student[];

        // Load additional data for each child
        const childrenSummaries: ChildSummary[] = await Promise.all(
          studentsData.map(async (student) => {
            // Load class info
            let classInfo: ClassInfo | null = null;
            try {
              const classDoc = await getDocs(
                query(
                  collection(db, 'classes'),
                  where('__name__', '==', student.currentClassId)
                )
              );
              if (!classDoc.empty) {
                const classData = classDoc.docs[0];
                classInfo = {
                  id: classData.id,
                  ...classData.data(),
                } as ClassInfo;
              }
            } catch (err) {
              console.error('Error loading class:', err);
            }

            // Load latest published result for this student
            let latestResult: LatestResult | null = null;
            try {
              // Get the most recent term with published scores
              const scoresQuery = query(
                collection(db, 'scores'),
                where('tenantId', '==', user.tenantId),
                where('studentId', '==', student.id),
                where('isPublished', '==', true)
              );

              const scoresSnapshot = await getDocs(scoresQuery);

              if (!scoresSnapshot.empty) {
                // Group scores by term to find the latest term
                const scoresByTerm = new Map<string, any[]>();
                scoresSnapshot.docs.forEach(doc => {
                  const scoreData = doc.data();
                  if (!scoresByTerm.has(scoreData.termId)) {
                    scoresByTerm.set(scoreData.termId, []);
                  }
                  scoresByTerm.get(scoreData.termId)!.push(scoreData);
                });

                // Get the most recent term
                const terms = await Promise.all(
                  Array.from(scoresByTerm.keys()).map(async (termId) => {
                    const termDoc = await getDoc(doc(db, 'terms', termId));
                    if (termDoc.exists()) {
                      return { id: termDoc.id, ...termDoc.data() } as any;
                    }
                    return null;
                  })
                );

                const validTerms = terms.filter((t): t is any => t !== null);
                if (validTerms.length > 0) {
                  // Sort by start date to get the latest term
                  validTerms.sort((a: any, b: any) => {
                    const dateA = a.startDate?.toDate?.() || new Date(0);
                    const dateB = b.startDate?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  });

                  const latestTerm = validTerms[0];
                  const termScores = scoresByTerm.get(latestTerm.id) || [];

                  // Calculate result
                  const subjectScores: SubjectScore[] = termScores.map(score => ({
                    subjectId: score.subjectId,
                    subjectName: '',
                    total: score.total || 0,
                    percentage: score.percentage || 0,
                    grade: score.grade || 'F9',
                    maxScore: 100,
                    isAbsent: score.isAbsent || false,
                    isExempted: score.isExempted || false,
                  }));

                  const termResult = calculateTermResult(subjectScores, { passMark: 40 });

                  // Get class position if available
                  let position: number | undefined = undefined;
                  if (termScores[0]?.position) {
                    position = termScores[0].position;
                  }

                  latestResult = {
                    termName: latestTerm.name,
                    averageScore: termResult.averageScore,
                    position: position,
                    totalSubjects: termResult.numberOfSubjects,
                  };
                }
              }
            } catch (err) {
              console.error('Error loading latest result:', err);
            }

            return {
              student,
              classInfo,
              latestResult,
            };
          })
        );

        setChildren(childrenSummaries);
        setLoading(false);
      } catch (error) {
        console.error('Error loading children:', error);
        setLoading(false);
      }
    };

    loadChildren();
  }, [user?.tenantId, user?.uid, user?.role, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleDownloadAllReports = async () => {
    // TODO: Implement bulk PDF download when latest results are available
    setDownloadingAll(true);
    try {
      alert('Bulk PDF download will be implemented when results are available');
    } finally {
      setDownloadingAll(false);
    }
  };

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      father: 'Father',
      mother: 'Mother',
      legal_guardian: 'Legal Guardian',
      other: 'Guardian',
    };
    return labels[type] || 'Guardian';
  };

  return (
    <div className="space-y-6">
      {/* Header with Guardian Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {guardianInfo ? `Welcome, ${guardianInfo.name}` : "View your children's academic progress"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/parent/fees')}
            variant="outline"
          >
            <BanknotesIcon className="h-5 w-5 mr-2" />
            Fees & Payments
          </Button>
          {children.length > 1 && (
            <Button
              onClick={handleDownloadAllReports}
              disabled={downloadingAll}
              variant="outline"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              {downloadingAll ? 'Downloading...' : 'Download All Reports'}
            </Button>
          )}
        </div>
      </div>

      {/* Guardian Profile Card */}
      {guardianInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Guardian Information</h2>
                <p className="text-sm text-gray-600">{getRelationshipLabel(guardianInfo.relationshipType)}</p>
              </div>
              <div className="flex gap-2">
                {guardianInfo.isPrimary && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Primary
                  </span>
                )}
                {guardianInfo.isEmergencyContact && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    Emergency Contact
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {guardianInfo.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                {guardianInfo.phone}
              </div>
              {guardianInfo.phone2 && (
                <div className="flex items-center text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {guardianInfo.phone2}
                </div>
              )}
              {guardianInfo.address && (
                <div className="flex items-center text-sm text-gray-600 md:col-span-2">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  {guardianInfo.address}
                </div>
              )}
              {guardianInfo.occupation && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Occupation:</span> {guardianInfo.occupation}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children Grid */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Linked</h3>
            <p className="text-gray-600">
              No children are currently linked to your account. Please contact the school administration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map(({ student, classInfo, latestResult }) => (
            <Card
              key={student.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="pt-6">
                {/* Student Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{student.admissionNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Class Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <AcademicCapIcon className="h-5 w-5 mr-2" />
                    {classInfo ? (
                      <span>
                        {classInfo.name} • {classInfo.level}
                      </span>
                    ) : (
                      <span>Class information unavailable</span>
                    )}
                  </div>
                </div>

                {/* Latest Result Summary */}
                {latestResult ? (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">{latestResult.termName}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Average</p>
                        <p className="text-lg font-bold text-blue-600">
                          {latestResult.averageScore.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Position</p>
                        <p className="text-lg font-bold text-purple-600">
                          {latestResult.position || '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Subjects</p>
                        <p className="text-lg font-bold text-gray-900">
                          {latestResult.totalSubjects}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No recent results available</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/parent/children/${student.id}`)}
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    View Results
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/parent/children/${student.id}/profile`)}
                  >
                    <UserIcon className="h-5 w-5 mr-2" />
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/parent/fees')}
                  >
                    <BanknotesIcon className="h-5 w-5 mr-2" />
                    View Fees
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {children.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
              Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Children</p>
                <p className="text-3xl font-bold text-blue-600">{children.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">With Results</p>
                <p className="text-3xl font-bold text-green-600">
                  {children.filter(c => c.latestResult).length}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active Enrollments</p>
                <p className="text-3xl font-bold text-purple-600">{children.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
