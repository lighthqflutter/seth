/**
 * Receipt PDF Component
 * Phase 23: Fee Management System
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Payment, StudentFee } from '@/types/fees';
import { formatCurrency, getPaymentMethodName, getFeeTypeName } from '@/lib/feeHelpers';

interface ReceiptPDFProps {
  payment: Payment;
  studentFee: StudentFee;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName: string;
  };
  school: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  schoolInfo: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#dbeafe',
    padding: 10,
    borderRadius: 4,
  },
  receiptNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontSize: 10,
    color: '#6b7280',
  },
  value: {
    width: '60%',
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
  },
  tableCol1: {
    width: '50%',
  },
  tableCol2: {
    width: '25%',
    textAlign: 'right',
  },
  tableCol3: {
    width: '25%',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#dbeafe',
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 5,
  },
  amountBox: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    padding: 15,
    borderRadius: 4,
    textAlign: 'center',
    marginVertical: 20,
  },
  amountLabel: {
    fontSize: 10,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 3,
  },
  signature: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTop: 1,
    borderTopColor: '#9ca3af',
    paddingTop: 5,
    fontSize: 9,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 60,
    color: '#f3f4f6',
    opacity: 0.3,
    fontWeight: 'bold',
  },
  stamp: {
    marginTop: 20,
    padding: 10,
    border: 2,
    borderColor: '#10b981',
    borderRadius: 4,
    textAlign: 'center',
  },
  stampText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },
});

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ payment, studentFee, student, school }) => {
  // Handle payment date - could be Date object, Firestore Timestamp, or ISO string
  const paymentDate = payment.paymentDate instanceof Date
    ? payment.paymentDate
    : (payment.paymentDate as any)?.toDate
    ? (payment.paymentDate as any).toDate()
    : payment.paymentDate
    ? new Date(payment.paymentDate as any)
    : new Date();

  // Handle due date - could be Date object, Firestore Timestamp, ISO string, or undefined
  const dueDate = !studentFee.dueDate
    ? undefined
    : studentFee.dueDate instanceof Date
    ? studentFee.dueDate
    : (studentFee.dueDate as any)?.toDate
    ? (studentFee.dueDate as any).toDate()
    : new Date(studentFee.dueDate as any);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PAID</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{school.name}</Text>
          <Text style={styles.schoolInfo}>{school.address}</Text>
          <Text style={styles.schoolInfo}>
            Tel: {school.phone} | Email: {school.email}
          </Text>
        </View>

        {/* Receipt Title */}
        <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
        <Text style={styles.receiptNumber}>Receipt No: {payment.receiptNumber}</Text>

        {/* Student Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Student Name:</Text>
            <Text style={styles.value}>
              {student.firstName} {student.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Admission Number:</Text>
            <Text style={styles.value}>{student.admissionNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Class:</Text>
            <Text style={styles.value}>{student.currentClassName}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{paymentDate.toLocaleDateString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{getPaymentMethodName(payment.paymentMethod)}</Text>
          </View>
          {payment.transactionReference && (
            <View style={styles.row}>
              <Text style={styles.label}>Transaction Reference:</Text>
              <Text style={styles.value}>{payment.transactionReference}</Text>
            </View>
          )}
          {payment.bankName && (
            <View style={styles.row}>
              <Text style={styles.label}>Bank Name:</Text>
              <Text style={styles.value}>{payment.bankName}</Text>
            </View>
          )}
          {payment.chequeNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Cheque Number:</Text>
              <Text style={styles.value}>{payment.chequeNumber}</Text>
            </View>
          )}
        </View>

        {/* Fee Details Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Fee Description</Text>
            <Text style={styles.tableCol2}>Total Amount</Text>
            <Text style={styles.tableCol3}>Amount Paid</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol1}>{studentFee.feeName}</Text>
            <Text style={styles.tableCol2}>{formatCurrency(studentFee.finalAmount)}</Text>
            <Text style={styles.tableCol3}>{formatCurrency(payment.amount)}</Text>
          </View>
        </View>

        {/* Amount Paid Box */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>AMOUNT PAID</Text>
          <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
        </View>

        {/* Balance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Fee Amount:</Text>
            <Text style={styles.value}>{formatCurrency(studentFee.finalAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Previous Payments:</Text>
            <Text style={styles.value}>
              {formatCurrency(Math.max(0, studentFee.amountPaid - payment.amount))}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Payment:</Text>
            <Text style={styles.value}>{formatCurrency(payment.amount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Paid to Date:</Text>
            <Text style={styles.value}>{formatCurrency(studentFee.amountPaid)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Outstanding Balance:</Text>
            <Text style={[styles.value, { color: '#ef4444' }]}>
              {formatCurrency(Math.max(0, studentFee.amountOutstanding))}
            </Text>
          </View>
        </View>

        {/* Payment Status Stamp */}
        {studentFee.amountOutstanding === 0 && (
          <View style={styles.stamp}>
            <Text style={styles.stampText}>✓ FULLY PAID</Text>
          </View>
        )}

        {/* Notes */}
        {payment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{payment.notes}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signature}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Received By</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Authorized Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is an official receipt generated by {school.name}
          </Text>
          <Text style={styles.footerText}>
            Generated on: {new Date().toLocaleString()}
          </Text>
          <Text style={styles.footerText}>
            For inquiries, please contact {school.email} or call {school.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
