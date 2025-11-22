'use client';

/**
 * Parent Receipt View and Download Page
 * Shows receipt for paid fees
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
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

export default function ParentReceiptPage({ params }: ReceiptPageProps) {
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

      // Use API route to fetch receipt data (avoids Firestore permission issues)
      const response = await fetch(
        `/api/payments/receipt/${receiptId}?tenantId=${user.tenantId}&userId=${user.uid}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load receipt');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load receipt');
      }

      // Convert ISO date strings back to Date objects
      const paymentData = {
        ...data.payment,
        paymentDate: data.payment.paymentDate
          ? new Date(data.payment.paymentDate)
          : new Date(),
      };

      const studentFeeData = {
        ...data.studentFee,
        dueDate: data.studentFee.dueDate
          ? new Date(data.studentFee.dueDate)
          : undefined,
      };

      setPayment(paymentData);
      setStudentFee(studentFeeData);
      setStudent(data.student);
      setSchool(data.school);
    } catch (error: any) {
      console.error('Error loading receipt data:', error);

      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Receipt not found')) {
        alert('No payment record found for this fee. The fee may have been marked as paid manually without creating a payment record.');
      } else {
        alert('Failed to load receipt: ' + errorMessage);
      }
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
          <Button className="mt-4" onClick={() => router.push('/parent/fees')}>
            Back to Fees
          </Button>
        </div>
      </div>
    );
  }

  // Payment date is already a Date object from the API response
  const paymentDate = payment.paymentDate instanceof Date
    ? payment.paymentDate
    : (payment.paymentDate as any)?.toDate
    ? (payment.paymentDate as any).toDate()
    : new Date(payment.paymentDate as any);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/parent/fees')}
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
                Balance: {formatCurrency(Math.max(0, studentFee.amountOutstanding))}
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
