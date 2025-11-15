'use client';

/**
 * Receipt View and Download Page
 * Phase 23: Fee Management System
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { Payment, StudentFee } from '@/types/fees';
import { formatCurrency, getPaymentMethodName } from '@/lib/feeHelpers';
import dynamic from 'next/dynamic';

// Dynamically import PDF components to avoid SSR issues
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false }
);

const ReceiptPDF = dynamic(() => import('@/components/pdf/ReceiptPDF'), {
  ssr: false,
});

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default function ReceiptPage({ params }: ReceiptPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [studentFee, setStudentFee] = useState<StudentFee | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [receiptId, setReceiptId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Unwrap params
    params.then(resolvedParams => {
      setReceiptId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (!user?.tenantId || !receiptId) return;
    loadReceiptData();
  }, [user, receiptId]);

  const loadReceiptData = async () => {
    if (!user?.tenantId || !receiptId) return;

    try {
      setLoading(true);

      // Load payment
      const paymentDoc = await getDoc(doc(db, 'payments', receiptId));
      if (!paymentDoc.exists()) {
        alert('Receipt not found');
        router.push('/dashboard/fees');
        return;
      }

      const paymentData = { id: paymentDoc.id, ...paymentDoc.data() } as Payment;
      setPayment(paymentData);

      // Load student fee
      const feeDoc = await getDoc(doc(db, 'studentFees', paymentData.studentFeeId));
      if (feeDoc.exists()) {
        setStudentFee({ id: feeDoc.id, ...feeDoc.data() } as StudentFee);
      }

      // Load student
      const studentDoc = await getDoc(doc(db, 'students', paymentData.studentId));
      if (studentDoc.exists()) {
        setStudent({ id: studentDoc.id, ...studentDoc.data() });
      }

      // Load school info (tenant)
      const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
      if (tenantDoc.exists()) {
        const tenantData = tenantDoc.data();
        setSchool({
          name: tenantData.schoolName || 'School Name',
          address: tenantData.address || 'School Address',
          phone: tenantData.phone || 'N/A',
          email: tenantData.email || 'N/A',
          logo: tenantData.logo,
        });
      } else {
        setSchool({
          name: 'School Name',
          address: 'School Address',
          phone: 'N/A',
          email: 'N/A',
        });
      }
    } catch (error) {
      console.error('Error loading receipt data:', error);
      alert('Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!payment || !studentFee || !student || !school) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900">Receipt Not Found</h3>
          <p className="text-red-700 text-sm mt-1">
            The requested receipt could not be found.
          </p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/fees')}>
            Back to Fees
          </Button>
        </div>
      </div>
    );
  }

  const paymentDate =
    payment.paymentDate instanceof Date
      ? payment.paymentDate
      : payment.paymentDate.toDate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/fees')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Receipt #{payment.receiptNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Payment recorded on {paymentDate.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <PDFDownloadLink
            document={
              <ReceiptPDF
                payment={payment}
                studentFee={studentFee}
                student={student}
                school={school}
              />
            }
            fileName={`Receipt_${payment.receiptNumber}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <Button disabled={pdfLoading}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                {pdfLoading ? 'Generating...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Receipt Summary Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Student</p>
              <p className="font-semibold text-gray-900">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-sm text-gray-600">{student.admissionNumber}</p>
              <p className="text-sm text-gray-600">{student.currentClassName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Details</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-sm text-gray-600">
                {getPaymentMethodName(payment.paymentMethod)}
              </p>
              <p className="text-sm text-gray-600">
                {paymentDate.toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Fee Information</p>
              <p className="font-semibold text-gray-900">{studentFee.feeName}</p>
              <p className="text-sm text-gray-600">
                Total: {formatCurrency(studentFee.finalAmount)}
              </p>
              <p className="text-sm text-gray-600">
                Balance: {formatCurrency(studentFee.amountOutstanding - payment.amount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview */}
      <Card>
        <CardContent className="pt-6">
          <div className="w-full" style={{ height: '800px' }}>
            <PDFViewer width="100%" height="100%">
              <ReceiptPDF
                payment={payment}
                studentFee={studentFee}
                student={student}
                school={school}
              />
            </PDFViewer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
