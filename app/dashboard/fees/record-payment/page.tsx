'use client';

/**
 * Record Payment Page
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
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircleIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StudentFee, PaymentMethod, Payment } from '@/types/fees';
import {
  formatCurrency,
  determinePaymentStatus,
  calculateOutstanding,
  generateReceiptNumber,
  getPaymentMethodName,
} from '@/lib/feeHelpers';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassName: string;
}

export default function RecordPaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);

  // Form data
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash' as PaymentMethod,
    paymentDate: new Date().toISOString().split('T')[0],
    transactionReference: '',
    notes: '',
    // Bank transfer fields
    bankName: '',
    accountNumber: '',
    // Cheque fields
    chequeNumber: '',
    chequeBank: '',
    chequeDate: '',
  });

  useEffect(() => {
    if (!user?.tenantId) return;
    loadStudents();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents([]);
      return;
    }

    const filtered = students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered.slice(0, 10));
  }, [searchQuery, students]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentFees(selectedStudent.id);
    } else {
      setStudentFees([]);
      setSelectedFee(null);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    if (!user?.tenantId) return;

    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(studentsQuery);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadStudentFees = async (studentId: string) => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      // Get active term
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const termsSnapshot = await getDocs(termsQuery);
      if (termsSnapshot.empty) {
        setStudentFees([]);
        return;
      }
      const termId = termsSnapshot.docs[0].id;

      // Get student fees
      const feesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('studentId', '==', studentId),
        where('termId', '==', termId)
      );
      const feesSnapshot = await getDocs(feesQuery);
      const fees = feesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentFee[];

      // Filter out fully paid fees
      const unpaidFees = fees.filter((f) => f.status !== 'paid' && f.status !== 'waived');
      setStudentFees(unpaidFees);

      if (unpaidFees.length > 0) {
        setSelectedFee(unpaidFees[0]);
        setPaymentData({ ...paymentData, amount: unpaidFees[0].amountOutstanding.toString() });
      }
    } catch (error) {
      console.error('Error loading student fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    setFilteredStudents([]);
  };

  const handleFeeSelect = (feeId: string) => {
    const fee = studentFees.find((f) => f.id === feeId);
    if (fee) {
      setSelectedFee(fee);
      setPaymentData({ ...paymentData, amount: fee.amountOutstanding.toString() });
    }
  };

  const handleRecordPayment = async () => {
    if (!user?.tenantId || !selectedStudent || !selectedFee) return;

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > selectedFee.amountOutstanding) {
      alert(
        `Payment amount cannot exceed outstanding amount of ${formatCurrency(selectedFee.amountOutstanding)}`
      );
      return;
    }

    try {
      setSaving(true);

      // Get fee configuration for receipt number generation
      const configDoc = await getDoc(doc(db, 'feeConfigurations', user.tenantId));
      const config = configDoc.exists() ? configDoc.data() : null;

      const receiptPrefix = config?.receiptPrefix || 'RCP';
      const receiptNumberLength = config?.receiptNumberLength || 6;
      const nextReceiptNumber = config?.nextReceiptNumber || 1;

      const receiptNumber = generateReceiptNumber(
        receiptPrefix,
        receiptNumberLength,
        nextReceiptNumber
      );

      // Create payment record
      const payment: Omit<Payment, 'id'> = {
        tenantId: user.tenantId,
        studentId: selectedStudent.id,
        studentFeeId: selectedFee.id,
        amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: Timestamp.fromDate(new Date(paymentData.paymentDate)),
        receiptNumber,
        notes: paymentData.notes,
        recordedBy: user.uid,
        recordedAt: serverTimestamp() as any,
        isRefunded: false,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        transactionReference: paymentData.transactionReference || undefined,
        bankName: paymentData.bankName || undefined,
        accountNumber: paymentData.accountNumber || undefined,
        chequeNumber: paymentData.chequeNumber || undefined,
        chequeBank: paymentData.chequeBank || undefined,
        chequeDate: paymentData.chequeDate
          ? Timestamp.fromDate(new Date(paymentData.chequeDate))
          : undefined,
      };

      const paymentRef = await addDoc(collection(db, 'payments'), payment);

      // Update student fee
      const newAmountPaid = selectedFee.amountPaid + amount;
      const newAmountOutstanding = calculateOutstanding(selectedFee.finalAmount, newAmountPaid);
      const newStatus = determinePaymentStatus(
        selectedFee.finalAmount,
        newAmountPaid,
        selectedFee.isOverdue
      );

      await updateDoc(doc(db, 'studentFees', selectedFee.id), {
        amountPaid: newAmountPaid,
        amountOutstanding: newAmountOutstanding,
        status: newStatus,
        updatedAt: serverTimestamp() as any,
      });

      // Update next receipt number
      if (configDoc.exists()) {
        await updateDoc(doc(db, 'feeConfigurations', user.tenantId), {
          nextReceiptNumber: nextReceiptNumber + 1,
          updatedAt: serverTimestamp() as any,
        });
      }

      alert(`Payment recorded successfully! Receipt Number: ${receiptNumber}`);

      // Redirect to receipt view
      router.push(`/dashboard/fees/receipts/${paymentRef.id}`);
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const paymentMethods: PaymentMethod[] = [
    'cash',
    'bank_transfer',
    'cheque',
    'pos',
    'online_paystack',
    'online_flutterwave',
    'other',
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
          <p className="text-gray-600 mt-1">Record fee payments from students</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Student Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5" />
            Search Student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or admission number..."
              className="w-full"
            />
            {filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {student.admissionNumber} • {student.currentClassName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-gray-900">
                {selectedStudent.firstName} {selectedStudent.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {selectedStudent.admissionNumber} • {selectedStudent.currentClassName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Fees */}
      {selectedStudent && studentFees.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedFee?.id || ''}
              onValueChange={handleFeeSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fee to pay" />
              </SelectTrigger>
              <SelectContent>
                {studentFees.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.feeName} - {formatCurrency(fee.amountOutstanding)} outstanding
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedFee && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(selectedFee.finalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(selectedFee.amountPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(selectedFee.amountOutstanding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedFee.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedFee.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      {selectedFee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (₦) *
                </label>
                <Input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  max={selectedFee.amountOutstanding}
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {formatCurrency(selectedFee.amountOutstanding)}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, paymentMethod: value as PaymentMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {getPaymentMethodName(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, paymentDate: e.target.value })
                  }
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference (Optional)
                </label>
                <Input
                  value={paymentData.transactionReference}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, transactionReference: e.target.value })
                  }
                  placeholder="e.g., TXN123456789"
                />
              </div>

              {/* Bank Transfer Fields */}
              {paymentData.paymentMethod === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <Input
                      value={paymentData.bankName}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, bankName: e.target.value })
                      }
                      placeholder="e.g., GTBank, Access Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <Input
                      value={paymentData.accountNumber}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, accountNumber: e.target.value })
                      }
                      placeholder="10-digit account number"
                    />
                  </div>
                </>
              )}

              {/* Cheque Fields */}
              {paymentData.paymentMethod === 'cheque' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number
                    </label>
                    <Input
                      value={paymentData.chequeNumber}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, chequeNumber: e.target.value })
                      }
                      placeholder="Cheque number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Bank
                    </label>
                    <Input
                      value={paymentData.chequeBank}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, chequeBank: e.target.value })
                      }
                      placeholder="Bank that issued the cheque"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Date
                    </label>
                    <Input
                      type="date"
                      value={paymentData.chequeDate}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, chequeDate: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Additional notes about this payment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleRecordPayment}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {saving ? 'Recording Payment...' : 'Record Payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedStudent && studentFees.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">All Fees Paid!</p>
              <p className="text-gray-600 mt-2">
                This student has no pending fees for the current term.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
