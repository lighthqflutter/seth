'use client';

/**
 * Parent Fees Dashboard (Phase 24)
 * Shows all bills for parent's children with payment options
 *
 * Features:
 * - View all children's bills (due and paid)
 * - Filter by child, status, term
 * - Pay bills online (Paystack/Flutterwave)
 * - Upload bank transfer proof
 * - Download receipts for paid bills
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudentFee, Payment, PaymentStatus, PaymentGatewaySettings } from '@/types/fees';
import PaymentModal from '@/components/PaymentModal';
import {
  BanknotesIcon,
  DocumentArrowDownIcon,
  CreditCardIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
}

interface FeeWithDetails extends StudentFee {
  studentName: string;
  className: string;
  termName: string;
  receiptUrl?: string;
}

interface FilterOptions {
  studentId: string;
  status: PaymentStatus | 'all';
  termId: string;
}

export default function ParentFeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeWithDetails[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [gatewaySettings, setGatewaySettings] = useState<PaymentGatewaySettings | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeeWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    studentId: 'all',
    status: 'all',
    termId: 'all',
  });

  // Check parent access
  useEffect(() => {
    if (user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load students and fees
  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !user?.uid) return;

      try {
        // Load students linked to this parent
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

        setStudents(studentsData);

        if (studentsData.length === 0) {
          setLoading(false);
          return;
        }

        // Load fees for all children
        const studentIds = studentsData.map(s => s.id);
        const feesQuery = query(
          collection(db, 'studentFees'),
          where('tenantId', '==', user.tenantId),
          where('studentId', 'in', studentIds.slice(0, 10)) // Firestore limit
        );

        const feesSnapshot = await getDocs(feesQuery);

        // Load additional details for each fee
        const feesWithDetails: FeeWithDetails[] = await Promise.all(
          feesSnapshot.docs.map(async (feeDoc) => {
            const feeData = feeDoc.data() as StudentFee;
            const student = studentsData.find(s => s.id === feeData.studentId);

            // Load class name
            let className = 'Unknown Class';
            try {
              const classDoc = await getDoc(doc(db, 'classes', feeData.classId));
              if (classDoc.exists()) {
                className = classDoc.data().name;
              }
            } catch (err) {
              console.error('Error loading class:', err);
            }

            // Load term name
            let termName = 'Unknown Term';
            try {
              const termDoc = await getDoc(doc(db, 'terms', feeData.termId));
              if (termDoc.exists()) {
                termName = termDoc.data().name;
              }
            } catch (err) {
              console.error('Error loading term:', err);
            }

            // Load receipt if paid
            let receiptUrl: string | undefined = undefined;
            if (feeData.status === 'paid') {
              try {
                const paymentsQuery = query(
                  collection(db, 'payments'),
                  where('studentFeeId', '==', feeDoc.id),
                  orderBy('paymentDate', 'desc')
                );
                const paymentsSnapshot = await getDocs(paymentsQuery);
                if (!paymentsSnapshot.empty) {
                  const latestPayment = paymentsSnapshot.docs[0].data() as Payment;
                  receiptUrl = latestPayment.receiptUrl;
                }
              } catch (err) {
                console.error('Error loading receipt:', err);
              }
            }

            return {
              ...feeData,
              id: feeDoc.id,
              studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
              className,
              termName,
              receiptUrl,
            } as FeeWithDetails;
          })
        );

        setFees(feesWithDetails);

        // Load payment gateway settings
        const gatewayQuery = query(
          collection(db, 'payment_gateway_settings'),
          where('tenantId', '==', user.tenantId)
        );
        const gatewaySnapshot = await getDocs(gatewayQuery);
        if (!gatewaySnapshot.empty) {
          setGatewaySettings({
            id: gatewaySnapshot.docs[0].id,
            ...gatewaySnapshot.docs[0].data(),
          } as PaymentGatewaySettings);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading fees:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId, user?.uid]);

  // Filter fees based on selected filters
  const filteredFees = fees.filter(fee => {
    if (filters.studentId !== 'all' && fee.studentId !== filters.studentId) {
      return false;
    }
    if (filters.status !== 'all' && fee.status !== filters.status) {
      return false;
    }
    if (filters.termId !== 'all' && fee.termId !== filters.termId) {
      return false;
    }
    return true;
  });

  // Calculate summary statistics
  const summary = {
    totalDue: filteredFees.filter(f => f.status === 'pending' || f.status === 'partial').reduce((sum, f) => sum + f.amountOutstanding, 0),
    totalPaid: filteredFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amountPaid, 0),
    totalOverdue: filteredFees.filter(f => f.isOverdue).reduce((sum, f) => sum + f.amountOutstanding, 0),
    pendingCount: filteredFees.filter(f => f.status === 'pending' || f.status === 'partial').length,
    overdueCount: filteredFees.filter(f => f.isOverdue).length,
  };

  const getStatusBadge = (status: PaymentStatus, isOverdue: boolean) => {
    if (isOverdue && status !== 'paid') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Overdue
        </span>
      );
    }

    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Partial
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handlePayOnline = (fee: FeeWithDetails) => {
    setSelectedFee(fee);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedFee(null);
    // Reload fees to reflect payment
    window.location.reload();
  };

  const handleUploadProof = (fee: FeeWithDetails) => {
    // TODO: Navigate to upload proof page
    router.push(`/parent/fees/upload-proof/${fee.id}`);
  };

  const handleDownloadReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, '_blank');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>
        <p className="text-gray-600 mt-1">Manage your children's school fees and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalDue)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.pendingCount} bills</p>
              </div>
              <BanknotesIcon className="h-10 w-10 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
                <p className="text-xs text-gray-500 mt-1">This term</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalOverdue)}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.overdueCount} bills</p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Children</p>
                <p className="text-2xl font-bold text-blue-600">{students.length}</p>
                <p className="text-xs text-gray-500 mt-1">With bills</p>
              </div>
              <BanknotesIcon className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                <select
                  value={filters.studentId}
                  onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Children</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as PaymentStatus | 'all' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <select
                  value={filters.termId}
                  onChange={(e) => setFilters({ ...filters, termId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Terms</option>
                  {/* TODO: Load terms dynamically */}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees List */}
      {filteredFees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bills Found</h3>
            <p className="text-gray-600">
              {fees.length === 0
                ? 'No bills have been assigned yet.'
                : 'No bills match your selected filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFees.map((fee) => (
            <Card key={fee.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Fee Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{fee.feeName}</h3>
                        <p className="text-sm text-gray-600">
                          {fee.studentName} • {fee.className} • {fee.termName}
                        </p>
                      </div>
                      {getStatusBadge(fee.status, fee.isOverdue)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-600">Amount</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(fee.finalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Paid</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(fee.amountPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Outstanding</p>
                        <p className="text-sm font-semibold text-red-600">
                          {formatCurrency(fee.amountOutstanding)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Due Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(fee.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {fee.status === 'paid' ? (
                      <>
                        {fee.receiptUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReceipt(fee.receiptUrl!)}
                          >
                            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                            Download Receipt
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {(gatewaySettings?.paystack.enabled || gatewaySettings?.flutterwave.enabled) && (
                          <Button
                            size="sm"
                            onClick={() => handlePayOnline(fee)}
                          >
                            <CreditCardIcon className="h-4 w-4 mr-2" />
                            Pay Online
                          </Button>
                        )}
                        {gatewaySettings?.bankTransfer.enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadProof(fee)}
                          >
                            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                            Upload Proof
                          </Button>
                        )}
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

      {/* Payment Modal */}
      {selectedFee && gatewaySettings && user && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedFee(null);
          }}
          fee={{
            id: selectedFee.id,
            feeName: selectedFee.feeName,
            studentName: selectedFee.studentName,
            amountOutstanding: selectedFee.amountOutstanding,
          }}
          gatewaySettings={{
            paystack: gatewaySettings.paystack,
            flutterwave: gatewaySettings.flutterwave,
          }}
          userId={user.uid}
          tenantId={user.tenantId}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
