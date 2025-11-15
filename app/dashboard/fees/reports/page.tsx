'use client';

/**
 * Financial Reports Dashboard
 * Phase 23: Fee Management System
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { StudentFee, Payment, RevenueReport } from '@/types/fees';
import {
  formatCurrency,
  calculatePaymentSummary,
  getFeeTypeName,
  getPaymentMethodName,
  feesToCSV,
} from '@/lib/feeHelpers';

export default function FeesReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user?.tenantId) return;
    loadTerms();
  }, [user]);

  useEffect(() => {
    if (selectedTerm) {
      loadReportData();
    }
  }, [selectedTerm]);

  const loadTerms = async () => {
    if (!user?.tenantId) return;

    try {
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId)
      );
      const termsSnapshot = await getDocs(termsQuery);
      const termsData = termsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setTerms(termsData);

      // Select first term by default
      if (termsData.length > 0 && !selectedTerm) {
        setSelectedTerm(termsData[0].id);
      }
    } catch (error) {
      console.error('Error loading terms:', error);
    }
  };

  const loadReportData = async () => {
    if (!user?.tenantId || !selectedTerm) return;

    try {
      setLoading(true);

      // Load term details
      const termQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId)
      );
      const termSnapshot = await getDocs(termQuery);
      const termDoc = termSnapshot.docs.find((doc) => doc.id === selectedTerm);
      const termData = termDoc?.data();

      // Load fees
      const feesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTerm)
      );
      const feesSnapshot = await getDocs(feesQuery);
      const feesData = feesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentFee[];
      setFees(feesData);

      // Load payments for the term
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('tenantId', '==', user.tenantId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const allPayments = paymentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Payment[];

      // Filter payments for this term's fees
      const termFeeIds = feesData.map((f) => f.id);
      const termPayments = allPayments.filter((p) =>
        termFeeIds.includes(p.studentFeeId)
      );
      setPayments(termPayments);

      // Calculate report data
      const summary = calculatePaymentSummary(feesData);

      // Group by fee type
      const byFeeType: { [key: string]: { expected: number; paid: number } } = {};
      feesData.forEach((fee) => {
        if (!byFeeType[fee.feeType]) {
          byFeeType[fee.feeType] = { expected: 0, paid: 0 };
        }
        byFeeType[fee.feeType].expected += fee.finalAmount;
        byFeeType[fee.feeType].paid += fee.amountPaid;
      });

      const byFeeTypeArray = Object.entries(byFeeType).map(([feeType, data]) => ({
        feeType: feeType as any,
        feeName: getFeeTypeName(feeType),
        revenue: data.paid,
        expected: data.expected,
        collectionRate: data.expected > 0 ? (data.paid / data.expected) * 100 : 0,
      }));

      // Group by class
      const byClass: { [key: string]: { expected: number; paid: number } } = {};
      feesData.forEach((fee) => {
        if (!byClass[fee.classId]) {
          byClass[fee.classId] = { expected: 0, paid: 0 };
        }
        byClass[fee.classId].expected += fee.finalAmount;
        byClass[fee.classId].paid += fee.amountPaid;
      });

      // Load class names
      const classesQuery = query(
        collection(db, 'classes'),
        where('tenantId', '==', user.tenantId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classNames = new Map<string, string>();
      classesSnapshot.docs.forEach((doc) => {
        classNames.set(doc.id, doc.data().name);
      });

      const byClassArray = Object.entries(byClass).map(([classId, data]) => ({
        classId,
        className: classNames.get(classId) || 'Unknown',
        revenue: data.paid,
        expected: data.expected,
        collectionRate: data.expected > 0 ? (data.paid / data.expected) * 100 : 0,
      }));

      // Group by payment method
      const byPaymentMethod: { [key: string]: { count: number; amount: number } } = {};
      termPayments.forEach((payment) => {
        if (!byPaymentMethod[payment.paymentMethod]) {
          byPaymentMethod[payment.paymentMethod] = { count: 0, amount: 0 };
        }
        byPaymentMethod[payment.paymentMethod].count++;
        byPaymentMethod[payment.paymentMethod].amount += payment.amount;
      });

      const byPaymentMethodArray = Object.entries(byPaymentMethod).map(
        ([method, data]) => ({
          method: method as any,
          count: data.count,
          amount: data.amount,
        })
      );

      // Payment trends (group by date)
      const trendsMap = new Map<string, { revenue: number; paymentsCount: number }>();
      termPayments.forEach((payment) => {
        const date =
          payment.paymentDate instanceof Date
            ? payment.paymentDate
            : payment.paymentDate.toDate();
        const dateKey = date.toISOString().split('T')[0];

        const existing = trendsMap.get(dateKey) || { revenue: 0, paymentsCount: 0 };
        existing.revenue += payment.amount;
        existing.paymentsCount++;
        trendsMap.set(dateKey, existing);
      });

      const trends = Array.from(trendsMap.entries())
        .map(([dateStr, data]) => ({
          date: new Date(dateStr),
          revenue: data.revenue,
          paymentsCount: data.paymentsCount,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setReport({
        period: {
          startDate: termData?.startDate?.toDate
            ? termData.startDate.toDate()
            : new Date(termData?.startDate || Date.now()),
          endDate: termData?.endDate?.toDate
            ? termData.endDate.toDate()
            : new Date(termData?.endDate || Date.now()),
          termId: selectedTerm,
        },
        totalRevenue: summary.totalPaid,
        totalExpected: summary.totalExpected,
        collectionRate:
          summary.totalExpected > 0
            ? (summary.totalPaid / summary.totalExpected) * 100
            : 0,
        byFeeType: byFeeTypeArray,
        byClass: byClassArray,
        byPaymentMethod: byPaymentMethodArray,
        trends,
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (fees.length === 0) {
      alert('No data to export');
      return;
    }

    // Load student data for export
    const loadStudentsAndExport = async () => {
      const studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', user?.tenantId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsMap = new Map<string, any>();
      studentsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        studentsMap.set(doc.id, {
          name: `${data.firstName} ${data.lastName}`,
          admissionNumber: data.admissionNumber,
          className: data.currentClassName,
        });
      });

      const csv = feesToCSV(fees, studentsMap);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fee_Report_${selectedTerm}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };

    loadStudentsAndExport();
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Revenue and collection analytics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Term Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <label className="font-medium text-gray-900">Report Period:</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(report.totalRevenue)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Expected Revenue</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {formatCurrency(report.totalExpected)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Collection Rate</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {report.collectionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Fee Type */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Revenue by Fee Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.byFeeType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feeName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue Collected" />
                  <Bar dataKey="expected" fill="#3b82f6" name="Expected Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue by Class */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Revenue by Class</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.byClass} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="className" type="category" width={100} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Trends */}
          {report.trends.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Payment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={report.trends.map((t) => ({
                      ...t,
                      date: t.date.toLocaleDateString(),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'revenue' ? formatCurrency(value) : value
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      name="Revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="paymentsCount"
                      stroke="#3b82f6"
                      name="Payments Count"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Payment Methods */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Payment Methods Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={report.byPaymentMethod}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      label={(entry) => getPaymentMethodName(entry.method)}
                    >
                      {report.byPaymentMethod.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {report.byPaymentMethod.map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">
                          {getPaymentMethodName(method.method)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(method.amount)}
                        </p>
                        <p className="text-xs text-gray-600">{method.count} payments</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
