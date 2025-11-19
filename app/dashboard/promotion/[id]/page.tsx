'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PromotionCampaign, PromotionRecord } from '@/types';

interface ClassSubmissionStatus {
  classId: string;
  className: string;
  teacherId?: string;
  teacherName?: string;
  totalStudents: number;
  submittedStudents: number;
  toPromote: number;
  toRepeat: number;
  toGraduate: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved';
  submittedAt?: Date;
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<PromotionCampaign | null>(null);
  const [classStatuses, setClassStatuses] = useState<ClassSubmissionStatus[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'execute'>('overview');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      if (!user?.tenantId || !campaignId) return;

      try {
        // Load campaign
        const campaignDoc = await getDoc(doc(db, 'promotion_campaigns', campaignId));
        if (!campaignDoc.exists()) {
          alert('Campaign not found');
          router.push('/dashboard/promotion');
          return;
        }

        const campaignData = {
          id: campaignDoc.id,
          ...campaignDoc.data(),
        } as PromotionCampaign;
        setCampaign(campaignData);

        // Load all classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnapshot = await getDocs(classesQuery);

        // Load promotion records for this campaign
        const recordsQuery = query(
          collection(db, 'promotion_records'),
          where('campaignId', '==', campaignId)
        );
        const recordsSnapshot = await getDocs(recordsQuery);
        const records = recordsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PromotionRecord[];

        // Build class status summary
        const statuses: ClassSubmissionStatus[] = [];

        for (const classDoc of classesSnapshot.docs) {
          const classData = classDoc.data();
          const classRecords = records.filter(r => r.fromClassId === classDoc.id);

          // Count students by decision
          const toPromote = classRecords.filter(r => r.decision === 'promote').length;
          const toRepeat = classRecords.filter(r => r.decision === 'repeat').length;
          const toGraduate = classRecords.filter(r => r.decision === 'graduate').length;

          // Determine submission status
          let status: ClassSubmissionStatus['status'] = 'not_started';
          let submittedAt: Date | undefined;

          if (classRecords.length > 0) {
            const allSubmitted = classRecords.every(r => r.status === 'submitted' || r.status === 'approved');
            const allApproved = classRecords.every(r => r.status === 'approved');

            if (allApproved) {
              status = 'approved';
            } else if (allSubmitted) {
              status = 'submitted';
              const firstSubmitted = classRecords.find(r => r.submittedAt);
              if (firstSubmitted?.submittedAt) {
                submittedAt = firstSubmitted.submittedAt.toDate();
              }
            } else {
              status = 'in_progress';
            }
          }

          statuses.push({
            classId: classDoc.id,
            className: classData.name,
            teacherId: classData.teacherId,
            teacherName: classData.teacherName,
            totalStudents: classData.studentCount || 0,
            submittedStudents: classRecords.length,
            toPromote,
            toRepeat,
            toGraduate,
            status,
            submittedAt,
          });
        }

        setClassStatuses(statuses);
        setLoading(false);
      } catch (error) {
        console.error('Error loading campaign:', error);
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, user?.tenantId, router]);

  const handleOpenCampaign = async () => {
    if (!campaign) return;

    if (confirm('Open this campaign for teacher submissions?')) {
      try {
        await updateDoc(doc(db, 'promotion_campaigns', campaign.id), {
          status: 'open',
          updatedAt: Timestamp.now(),
        });

        setCampaign({ ...campaign, status: 'open' });
        alert('Campaign opened! Teachers can now submit their promotion decisions.');
      } catch (error) {
        console.error('Error opening campaign:', error);
        alert('Failed to open campaign. Please try again.');
      }
    }
  };

  const handleExecuteCampaign = () => {
    if (!campaign) return;

    // Check if all classes have submitted
    if (submittedCount < classStatuses.length) {
      alert(`Cannot execute: ${classStatuses.length - submittedCount} class(es) have not submitted yet.`);
      return;
    }

    // Navigate to execution page
    router.push(`/dashboard/promotion/${campaign.id}/execute`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Campaign not found</p>
        <Button onClick={() => router.push('/dashboard/promotion')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const submittedCount = classStatuses.filter(c => c.status === 'submitted' || c.status === 'approved').length;
  const approvedCount = classStatuses.filter(c => c.status === 'approved').length;
  const totalStudentsToPromote = classStatuses.reduce((sum, c) => sum + c.toPromote + c.toGraduate, 0);
  const totalStudentsToRepeat = classStatuses.reduce((sum, c) => sum + c.toRepeat, 0);

  const getStatusColor = (status: ClassSubmissionStatus['status']) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ClassSubmissionStatus['status']) => {
    switch (status) {
      case 'not_started': return '⏸️';
      case 'in_progress': return '📝';
      case 'submitted': return '✉️';
      case 'approved': return '✅';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/promotion')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">
              {campaign.academicYear} → {campaign.newAcademicYear}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              campaign.status === 'open' ? 'bg-blue-100 text-blue-800' :
              campaign.status === 'executed' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>

            {campaign.status === 'draft' && (
              <Button onClick={handleOpenCampaign}>
                <PlayIcon className="h-4 w-4 mr-2" />
                Open Campaign
              </Button>
            )}

            {campaign.status === 'open' && submittedCount === classStatuses.length && (
              <Button onClick={handleExecuteCampaign}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Execute Promotions
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'submissions', label: 'Class Submissions' },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{classStatuses.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Submitted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {submittedCount} / {classStatuses.length}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {classStatuses.length > 0 ? Math.round((submittedCount / classStatuses.length) * 100) : 0}% complete
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>To Promote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{totalStudentsToPromote}</div>
                <div className="text-sm text-gray-500 mt-1">students</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>To Repeat</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{totalStudentsToRepeat}</div>
                <div className="text-sm text-gray-500 mt-1">students</div>
              </CardContent>
            </Card>
          </div>

          {/* Deadline Info */}
          {campaign.submissionDeadline && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-900">Submission Deadline</div>
                    <div className="text-sm text-yellow-800">
                      {campaign.submissionDeadline.toDate().toLocaleDateString()} at{' '}
                      {campaign.submissionDeadline.toDate().toLocaleTimeString()}
                      {campaign.submissionDeadline.toDate() < new Date() && (
                        <span className="ml-2 font-semibold">(Overdue)</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {campaign.status === 'open' && submittedCount < classStatuses.length && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📢</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-2">Waiting for Teacher Submissions</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      {classStatuses.length - submittedCount} class(es) still need to submit their promotion decisions.
                    </p>
                    <Button variant="outline" size="sm">
                      Send Reminder Emails
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {classStatuses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">No classes found for this campaign</p>
              </CardContent>
            </Card>
          ) : (
            classStatuses.map((classStatus) => (
              <Card key={classStatus.classId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{classStatus.className}</CardTitle>
                      {classStatus.teacherName && (
                        <CardDescription className="mt-1">
                          Class Teacher: {classStatus.teacherName}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(classStatus.status)}`}>
                        {getStatusIcon(classStatus.status)} {classStatus.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Total Students</div>
                      <div className="text-xl font-semibold text-gray-900">{classStatus.totalStudents}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Submitted</div>
                      <div className="text-xl font-semibold text-blue-600">
                        {classStatus.submittedStudents} / {classStatus.totalStudents}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">To Promote</div>
                      <div className="text-xl font-semibold text-green-600">{classStatus.toPromote}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">To Graduate</div>
                      <div className="text-xl font-semibold text-purple-600">{classStatus.toGraduate}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">To Repeat</div>
                      <div className="text-xl font-semibold text-red-600">{classStatus.toRepeat}</div>
                    </div>
                  </div>

                  {classStatus.submittedAt && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Submitted on {classStatus.submittedAt.toLocaleDateString()} at{' '}
                        {classStatus.submittedAt.toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                  {classStatus.status === 'submitted' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm">
                        Review Submissions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
