'use client';

/**
 * Fee Management Dashboard
 * Phase 23: Fee Management System
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';
import { StudentFee, Payment, FeeStatistics } from '@/types/fees';
import { calculatePaymentSummary, formatCurrency } from '@/lib/feeHelpers';

export default function FeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FeeStatistics | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    loadFeeStatistics();
  }, [user]);

  const loadFeeStatistics = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      // Load current term (check both isActive and isCurrent for backward compatibility)
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId)
      );
      const termsSnapshot = await getDocs(termsQuery);

      console.log('All terms:', termsSnapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        isActive: d.data().isActive,
        isCurrent: d.data().isCurrent
      })));

      // Find active or current term
      let term = termsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.isActive === true || data.isCurrent === true;
      });

      // If no active term found, use the most recent one
      if (!term && termsSnapshot.docs.length > 0) {
        console.warn('No active term found, using first term');
        term = termsSnapshot.docs[0];
      }

      if (!term) {
        console.error('No terms found at all');
        setLoading(false);
        return;
      }

      const termData = { id: term.id, name: term.data().name };
      console.log('Selected term for dashboard:', termData);
      setCurrentTerm(termData);

      // Load all students (filter isActive in-memory for backward compatibility)
      const studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', user.tenantId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const activeStudents = studentsSnapshot.docs.filter(
        doc => doc.data().isActive !== false
      );
      const totalStudents = activeStudents.length;

      // Load student fees for current term
      const feesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', term.id)
      );
      const feesSnapshot = await getDocs(feesQuery);
      const fees: StudentFee[] = feesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentFee[];

      console.log('=== FEES DASHBOARD DEBUG ===');
      console.log('Term:', termData);
      console.log('Total fees loaded:', fees.length);
      console.log('Sample fee:', fees[0]);
      console.log('===========================');

      // Calculate statistics - group fees by student first
      const feesByStudent = new Map<string, StudentFee[]>();
      fees.forEach((fee) => {
        if (!feesByStudent.has(fee.studentId)) {
          feesByStudent.set(fee.studentId, []);
        }
        feesByStudent.get(fee.studentId)!.push(fee);
      });

      const uniqueStudents = feesByStudent.size;
      const studentsWithFees = uniqueStudents;

      // Count students by their overall status
      let studentsFullyPaid = 0;
      let studentsPartiallyPaid = 0;
      let studentsPending = 0;
      let studentsOverdue = 0;

      feesByStudent.forEach((studentFees, studentId) => {
        const hasOverdue = studentFees.some(f => f.isOverdue && f.status !== 'paid');
        const allPaid = studentFees.every(f => f.status === 'paid');
        const anyPaid = studentFees.some(f => f.amountPaid > 0);
        const allPending = studentFees.every(f => f.status === 'pending');

        if (hasOverdue) {
          studentsOverdue++;
        } else if (allPaid) {
          studentsFullyPaid++;
        } else if (anyPaid) {
          studentsPartiallyPaid++;
        } else if (allPending) {
          studentsPending++;
        }
      });

      const summary = calculatePaymentSummary(fees);

      // Load recent payments (last 10)
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('tenantId', '==', user.tenantId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const recentPayments = paymentsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a: any, b: any) => {
          const aDate = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate);
          const bDate = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate);
          return bDate.getTime() - aDate.getTime();
        })
        .slice(0, 10) as Payment[];

      // Top defaulters
      const overdueFees = fees.filter((f) => f.isOverdue && f.status !== 'paid');
      const defaultersMap = new Map<string, { fees: StudentFee[]; total: number }>();

      overdueFees.forEach((fee) => {
        const existing = defaultersMap.get(fee.studentId) || { fees: [], total: 0 };
        existing.fees.push(fee);
        existing.total += fee.amountOutstanding;
        defaultersMap.set(fee.studentId, existing);
      });

      // Get student details for top 5 defaulters
      const topDefaultersData = Array.from(defaultersMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

      const topDefaulters = await Promise.all(
        topDefaultersData.map(async ([studentId, data]) => {
          const studentDoc = studentsSnapshot.docs.find((doc) => doc.id === studentId);
          const studentData = studentDoc?.data();

          return {
            studentId,
            studentName: `${studentData?.firstName || ''} ${studentData?.lastName || ''}`.trim(),
            admissionNumber: studentData?.admissionNumber || 'N/A',
            classId: studentData?.currentClassId || '',
            className: studentData?.currentClassName || 'N/A',
            totalOutstanding: data.total,
            overdueAmount: data.total,
            daysPastDue: Math.max(
              ...data.fees.map((f) => {
                const dueDate = f.dueDate instanceof Date ? f.dueDate : f.dueDate.toDate();
                const today = new Date();
                return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
              })
            ),
            fees: data.fees.map((f) => ({
              feeId: f.id,
              feeName: f.feeName,
              amount: f.amountOutstanding,
              dueDate: f.dueDate instanceof Date ? f.dueDate : f.dueDate.toDate(),
            })),
          };
        })
      );

      const collectionRate = calculateCollectionRate(summary.totalExpected, summary.totalPaid);

      setStats({
        term: termData,
        totalStudents,
        studentsWithFees,
        studentsFullyPaid,
        studentsPartiallyPaid,
        studentsPending,
        studentsOverdue,
        financials: {
          totalExpected: summary.totalExpected,
          totalCollected: summary.totalPaid,
          totalOutstanding: summary.totalOutstanding,
          totalOverdue: summary.totalOverdue,
          totalWaived: summary.totalWaived,
          collectionRate,
        },
        recentPayments,
        topDefaulters,
      });
    } catch (error) {
      console.error('Error loading fee statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCollectionRate = (expected: number, collected: number): number => {
    if (expected === 0) return 0;
    return Math.round((collected / expected) * 100 * 100) / 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">No Active Term</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Please activate a term to start managing fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-600 mt-1">
            {currentTerm?.name || 'Current Term'} - Financial Overview
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/fees/configuration')}
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => router.push('/dashboard/fees/structure')}>
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Manage Fee Structure
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.financials.totalExpected)}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.financials.totalCollected)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.financials.collectionRate}% collection rate
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {formatCurrency(stats.financials.totalOutstanding)}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(stats.financials.totalOverdue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.studentsOverdue} students
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Payment Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Student Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-sm text-gray-600 mt-1">Total Students</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats.studentsFullyPaid}</p>
              <p className="text-sm text-gray-600 mt-1">Fully Paid</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{stats.studentsPartiallyPaid}</p>
              <p className="text-sm text-gray-600 mt-1">Partially Paid</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{stats.studentsPending}</p>
              <p className="text-sm text-gray-600 mt-1">Pending</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{stats.studentsOverdue}</p>
              <p className="text-sm text-gray-600 mt-1">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5" />
                Recent Payments
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/fees/payments')}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentPayments.map((payment) => {
                  const paymentDate = payment.paymentDate instanceof Date
                    ? payment.paymentDate
                    : payment.paymentDate.toDate();

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Receipt: {payment.receiptNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {paymentDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Defaulters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                Top Defaulters
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/fees/defaulters')}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topDefaulters.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-600 font-medium">No overdue payments!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topDefaulters.map((defaulter) => (
                  <div
                    key={defaulter.studentId}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => router.push(`/dashboard/fees/student/${defaulter.studentId}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{defaulter.studentName}</p>
                        <p className="text-sm text-gray-600">{defaulter.className}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {formatCurrency(defaulter.overdueAmount)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {defaulter.daysPastDue} days overdue
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => router.push('/dashboard/fees/structure')}
            >
              <CurrencyDollarIcon className="h-8 w-8 mb-2" />
              <span>Fee Structure</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => router.push('/dashboard/fees/assign')}
            >
              <DocumentPlusIcon className="h-8 w-8 mb-2" />
              <span>Assign Fees</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => router.push('/dashboard/fees/record-payment')}
            >
              <CheckCircleIcon className="h-8 w-8 mb-2" />
              <span>Record Payment</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => router.push('/dashboard/fees/reports')}
            >
              <ChartBarIcon className="h-8 w-8 mb-2" />
              <span>Reports</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => router.push('/dashboard/fees/defaulters')}
            >
              <ExclamationTriangleIcon className="h-8 w-8 mb-2" />
              <span>Defaulters</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
