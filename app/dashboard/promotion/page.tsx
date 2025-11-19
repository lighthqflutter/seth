'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusIcon } from '@heroicons/react/24/outline';
import { PromotionCampaign } from '@/types';

export default function PromotionCampaignsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!user?.tenantId) return;

      try {
        const campaignsQuery = query(
          collection(db, 'promotion_campaigns'),
          where('tenantId', '==', user.tenantId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(campaignsQuery);
        const campaignsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PromotionCampaign[];

        setCampaigns(campaignsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading campaigns:', error);
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [user?.tenantId]);

  const getStatusColor = (status: PromotionCampaign['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'executed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: PromotionCampaign['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'open': return 'Open';
      case 'in_review': return 'In Review';
      case 'approved': return 'Approved';
      case 'executed': return 'Executed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Promotion Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage end-of-year student promotions</p>
        </div>
        <Button onClick={() => router.push('/dashboard/promotion/new')}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">How Promotion Campaigns Work</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Create a campaign for the academic year transition</li>
                <li>• Teachers submit promotion decisions for their classes</li>
                <li>• Review all submissions and adjust as needed</li>
                <li>• Execute all promotions in one coordinated batch</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No promotion campaigns yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first campaign to start managing student promotions
            </p>
            <Button onClick={() => router.push('/dashboard/promotion/new')}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/promotion/${campaign.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusLabel(campaign.status)}
                      </span>
                    </div>
                    <CardDescription>
                      {campaign.academicYear} → {campaign.newAcademicYear}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Created by {campaign.createdByName}</div>
                    <div>{campaign.createdAt.toDate().toLocaleDateString()}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Total Classes</div>
                    <div className="text-xl font-semibold text-gray-900">{campaign.totalClasses}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Submitted</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {campaign.submittedClasses} / {campaign.totalClasses}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Total Students</div>
                    <div className="text-xl font-semibold text-gray-900">{campaign.totalStudents}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Progress</div>
                    <div className="text-xl font-semibold text-purple-600">
                      {campaign.totalStudents > 0
                        ? Math.round((campaign.processedStudents / campaign.totalStudents) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>

                {campaign.status === 'open' && campaign.submissionDeadline && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Submission Deadline:</span>
                      <span className="font-medium text-gray-900">
                        {campaign.submissionDeadline.toDate().toLocaleDateString()}
                      </span>
                      {campaign.submissionDeadline.toDate() < new Date() && (
                        <span className="text-red-600 font-medium">(Overdue)</span>
                      )}
                    </div>
                  </div>
                )}

                {campaign.status === 'executed' && campaign.executedAt && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <span>✅</span>
                      <span>
                        Executed on {campaign.executedAt.toDate().toLocaleDateString()} by {campaign.executedByName}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
