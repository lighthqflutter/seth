'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { PromotionCampaign, PromotionExecution } from '@/types';

export default function ExecutePromotionPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [campaign, setCampaign] = useState<PromotionCampaign | null>(null);
  const [execution, setExecution] = useState<PromotionExecution | null>(null);

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

        setLoading(false);
      } catch (error) {
        console.error('Error loading campaign:', error);
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, user?.tenantId, router]);

  // Monitor execution progress
  useEffect(() => {
    if (!campaign?.executionId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'promotion_executions', campaign.executionId),
      (snapshot) => {
        if (snapshot.exists()) {
          setExecution({
            id: snapshot.id,
            ...snapshot.data(),
          } as PromotionExecution);
        }
      },
      (error) => {
        console.error('Error monitoring execution:', error);
      }
    );

    return () => unsubscribe();
  }, [campaign?.executionId]);

  const handleExecute = async () => {
    if (!campaign || !user) return;

    if (!confirm(`Execute promotions for ${campaign.totalClasses} classes? This action cannot be undone.`)) {
      return;
    }

    setExecuting(true);

    try {
      const response = await fetch('/api/promotion/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          tenantId: user.tenantId,
          userId: user.uid,
          userName: user.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Execution failed');
      }

      const data = await response.json();
      alert(`Promotion executed successfully! ${data.successCount} students processed.`);

      // Refresh page to show results
      router.refresh();
    } catch (error: any) {
      console.error('Execution error:', error);
      alert(error.message || 'Failed to execute promotion. Please try again.');
      setExecuting(false);
    }
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

  const progressPercentage = execution
    ? Math.round((execution.processedStudents / execution.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/promotion/${campaign.id}`)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaign
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Execute Promotion Campaign</h1>
        <p className="text-gray-600 mt-1">{campaign.name}</p>
      </div>

      {/* Execution Status */}
      {!execution && campaign.status !== 'executed' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900 mb-2">Ready to Execute</h3>
                <p className="text-sm text-yellow-800 mb-4">
                  This will promote {campaign.totalStudents} students across {campaign.totalClasses} classes.
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleExecute}
                    disabled={executing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {executing ? 'Executing...' : 'Execute Promotions'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/promotion/${campaign.id}`)}
                    disabled={executing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Display */}
      {execution && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Progress</CardTitle>
              <CardDescription>
                {execution.status === 'processing'
                  ? 'Processing promotions...'
                  : execution.status === 'completed'
                  ? 'Execution completed'
                  : execution.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {execution.processedStudents} / {execution.totalStudents} students
                    </span>
                    <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        execution.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Batch Progress */}
                <div className="text-sm text-gray-600">
                  Processing batch {execution.currentBatch} of {execution.totalBatches}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Promoted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{execution.results.promoted}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Graduated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{execution.results.graduated}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Repeated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{execution.results.repeated}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Failed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{execution.results.failed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Errors List */}
          {execution.errors && execution.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900">Errors</CardTitle>
                <CardDescription>{execution.errors.length} students failed to process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {execution.errors.map((error, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-md">
                      <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-red-900">{error.studentName}</div>
                        <div className="text-sm text-red-700">{error.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Message */}
          {execution.status === 'completed' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Execution Completed</div>
                    <div className="text-sm text-green-800">
                      {execution.successCount} students processed successfully.
                      {execution.failedCount > 0 && ` ${execution.failedCount} failed.`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {execution.status === 'completed' && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push('/dashboard/promotion')}>
                Back to Campaigns
              </Button>
              <Button onClick={() => router.push('/dashboard/students')}>
                View Students
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
