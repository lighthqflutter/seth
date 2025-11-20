'use client';

/**
 * Bank Transfer Approvals Page
 * Finance users can view, approve, or reject bank transfer submissions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface BankTransferSubmission {
  id: string;
  tenantId: string;
  studentFeeId: string;
  studentId: string;
  studentName: string;
  submittedBy: string;
  amount: number;
  proofUrl: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  feeName: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function BankTransfersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<BankTransferSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<BankTransferSubmission | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check finance access
  useEffect(() => {
    if (user && user.role !== 'finance' && user.role !== 'admin' && user.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load submissions
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user?.tenantId) return;

      try {
        const params = new URLSearchParams({
          tenantId: user.tenantId,
        });

        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await fetch(`/api/payments/bank-transfer?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setSubmissions(data.submissions);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading submissions:', error);
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [user?.tenantId, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewProof = (submission: BankTransferSubmission) => {
    setSelectedSubmission(submission);
    setShowProofModal(true);
  };

  const handleApprove = async (submission: BankTransferSubmission) => {
    if (!confirm(`Approve payment of ${formatCurrency(submission.amount)} for ${submission.studentName}?`)) {
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/payments/bank-transfer/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          tenantId: user?.tenantId,
          userId: user?.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve payment');
      }

      alert('Payment approved successfully!');
      // Reload submissions
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to approve payment');
      setProcessing(false);
    }
  };

  const handleReject = async (submission: BankTransferSubmission) => {
    const reason = prompt('Please provide a reason for rejection:');

    if (!reason || !reason.trim()) {
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/payments/bank-transfer/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          tenantId: user?.tenantId,
          userId: user?.uid,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject payment');
      }

      alert('Payment rejected successfully!');
      // Reload submissions
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to reject payment');
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bank Transfer Approvals</h1>
            <p className="text-gray-600 mt-1">Review and approve bank transfer submissions</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.status === 'pending').length}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.status === 'approved').length}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {submissions.filter(s => s.status === 'rejected').length}
                  </p>
                </div>
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(submissions.reduce((sum, s) => sum + s.amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No bank transfer submissions yet.'
                  : `No ${statusFilter} submissions found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Submission Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {submission.studentName}
                          </h3>
                          <p className="text-sm text-gray-600">{submission.feeName}</p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(submission.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Proof Document</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {submission.fileName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        Submitted: {formatDateTime(submission.submittedAt)}
                        {submission.reviewedAt && (
                          <> • Reviewed: {formatDateTime(submission.reviewedAt)}</>
                        )}
                      </div>

                      {submission.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                          <strong>Rejection Reason:</strong> {submission.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProof(submission)}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Proof
                      </Button>

                      {submission.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(submission)}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(submission)}
                            disabled={processing}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircleIcon className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Proof Viewer Modal */}
      {showProofModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
            onClick={() => setShowProofModal(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
              {/* Header */}
              <div className="mb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Proof</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedSubmission.studentName} - {selectedSubmission.feeName}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Amount: {formatCurrency(selectedSubmission.amount)}
                  </p>
                </div>
                <button
                  onClick={() => setShowProofModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Proof Display */}
              <div className="bg-gray-100 rounded-lg p-4 max-h-[70vh] overflow-auto">
                {selectedSubmission.fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={selectedSubmission.proofUrl}
                    className="w-full h-[60vh] rounded"
                    title="Payment Proof"
                  />
                ) : (
                  <img
                    src={selectedSubmission.proofUrl}
                    alt="Payment Proof"
                    className="w-full h-auto rounded"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedSubmission.proofUrl, '_blank')}
                >
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowProofModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
