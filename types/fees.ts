/**
 * Fee Management Types
 * Phase 23: Fee Management System
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Fee Type Categories
 */
export type FeeType =
  | 'tuition'
  | 'registration'
  | 'books'
  | 'uniform'
  | 'transport'
  | 'lunch'
  | 'sports'
  | 'examination'
  | 'lab'
  | 'library'
  | 'hostel'
  | 'development'
  | 'pta'
  | 'excursion'
  | 'technology'
  | 'other';

/**
 * Payment Status
 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';

/**
 * Payment Method
 */
export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'cheque'
  | 'pos'
  | 'online_paystack'
  | 'online_flutterwave'
  | 'online_stripe'
  | 'other';

/**
 * Fee Structure Item
 * Defines a fee type with amount for a specific class/term
 */
export interface FeeStructureItem {
  id: string;
  tenantId: string;
  feeType: FeeType;
  customName?: string; // For 'other' fee types
  description: string;
  amount: number; // Amount in base currency (Naira)
  isMandatory: boolean;
  classId?: string; // If null, applies to all classes
  termId: string;
  dueDate: Date | Timestamp;
  latePenaltyPercentage?: number; // e.g., 5 = 5% late fee
  latePenaltyAmount?: number; // Fixed late fee amount
  earlyDiscountPercentage?: number; // e.g., 10 = 10% discount
  earlyDiscountDeadline?: Date | Timestamp;
  isActive: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy: string;
  updatedBy: string;
}

/**
 * Student Fee Assignment
 * Links a student to fees they need to pay
 */
export interface StudentFee {
  id: string;
  tenantId: string;
  studentId: string;
  feeStructureItemId: string;
  termId: string;
  classId: string;

  // Fee details (denormalized for quick access)
  feeType: FeeType;
  feeName: string;
  baseAmount: number;

  // Custom adjustments per student
  customAmount?: number; // Override base amount
  discountAmount?: number; // Scholarship, sibling discount, etc.
  discountReason?: string;
  waiverAmount?: number; // Partial or full waiver
  waiverReason?: string;

  // Calculated amounts
  finalAmount: number; // baseAmount - discounts - waivers + penalties
  amountPaid: number;
  amountOutstanding: number;

  // Status
  status: PaymentStatus;
  dueDate: Date | Timestamp;
  isOverdue: boolean;

  // Payment plan
  allowInstallments: boolean;
  installmentPlan?: InstallmentPlan;

  // Metadata
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  assignedBy: string;
}

/**
 * Installment Plan
 */
export interface InstallmentPlan {
  totalInstallments: number;
  installments: Installment[];
}

export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: Date | Timestamp;
  isPaid: boolean;
  paidAmount: number;
  paidDate?: Date | Timestamp;
  paymentId?: string;
}

/**
 * Payment Record
 */
export interface Payment {
  id: string;
  tenantId: string;
  studentId: string;
  studentFeeId: string;

  // Payment details
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date | Timestamp;

  // Bank transfer details
  bankName?: string;
  accountNumber?: string;
  transactionReference?: string;

  // Cheque details
  chequeNumber?: string;
  chequeBank?: string;
  chequeDate?: Date | Timestamp;

  // Online payment details
  onlineTransactionId?: string;
  onlinePaymentGateway?: string;
  onlinePaymentStatus?: 'pending' | 'successful' | 'failed';

  // Receipt
  receiptNumber: string;
  receiptUrl?: string; // PDF receipt URL

  // Metadata
  notes?: string;
  attachments?: string[]; // URLs to payment proof documents
  recordedBy: string;
  recordedAt: Date | Timestamp;

  // Refund tracking
  isRefunded: boolean;
  refundAmount?: number;
  refundDate?: Date | Timestamp;
  refundReason?: string;
  refundedBy?: string;

  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Fee Template
 * Reusable fee structures that can be applied to multiple terms
 */
export interface FeeTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  items: FeeTemplateItem[];
  isActive: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy: string;
}

export interface FeeTemplateItem {
  feeType: FeeType;
  customName?: string;
  description: string;
  amount: number;
  isMandatory: boolean;
  classId?: string;
}

/**
 * Payment Summary (for reporting)
 */
export interface PaymentSummary {
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  totalWaived: number;
  totalOverdue: number;

  byFeeType: {
    feeType: FeeType;
    feeName: string;
    expected: number;
    paid: number;
    outstanding: number;
  }[];

  byClass: {
    classId: string;
    className: string;
    expected: number;
    paid: number;
    outstanding: number;
    studentCount: number;
  }[];

  byStatus: {
    status: PaymentStatus;
    count: number;
    amount: number;
  }[];
}

/**
 * Defaulter (Student with overdue payments)
 */
export interface Defaulter {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;

  totalOutstanding: number;
  overdueAmount: number;
  daysPastDue: number;

  fees: {
    feeId: string;
    feeName: string;
    amount: number;
    dueDate: Date;
  }[];
}

/**
 * Revenue Report
 */
export interface RevenueReport {
  period: {
    startDate: Date;
    endDate: Date;
    termId?: string;
  };

  totalRevenue: number;
  totalExpected: number;
  collectionRate: number; // percentage

  byFeeType: {
    feeType: FeeType;
    feeName: string;
    revenue: number;
    expected: number;
    collectionRate: number;
  }[];

  byClass: {
    classId: string;
    className: string;
    revenue: number;
    expected: number;
    collectionRate: number;
  }[];

  byPaymentMethod: {
    method: PaymentMethod;
    count: number;
    amount: number;
  }[];

  trends: {
    date: Date;
    revenue: number;
    paymentsCount: number;
  }[];
}

/**
 * Fee Configuration (School-wide settings)
 */
export interface FeeConfiguration {
  tenantId: string;

  // Currency
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR' | 'other';
  currencySymbol: string;

  // Receipt settings
  receiptPrefix: string; // e.g., "RCP"
  receiptNumberLength: number; // e.g., 6 for RCP000001
  nextReceiptNumber: number;

  // Late payment settings
  enableLatePenalty: boolean;
  defaultLatePenaltyPercentage: number;
  gracePeriodDays: number; // Days after due date before penalty applies

  // Early payment settings
  enableEarlyDiscount: boolean;
  defaultEarlyDiscountPercentage: number;

  // Payment methods enabled
  enabledPaymentMethods: PaymentMethod[];

  // Online payment gateway settings
  paystackPublicKey?: string;
  paystackSecretKey?: string;
  flutterwavePublicKey?: string;
  flutterwaveSecretKey?: string;
  stripePublicKey?: string;
  stripeSecretKey?: string;

  // Notifications
  sendPaymentReminders: boolean;
  reminderDaysBefore: number[]; // e.g., [7, 3, 1] days before due date
  sendPaymentConfirmations: boolean;
  sendOverdueNotifications: boolean;

  // Receipt template
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolLogo?: string;
  receiptFooterText?: string;

  updatedAt: Date | Timestamp;
  updatedBy: string;
}

/**
 * Fee Statistics (for dashboard)
 */
export interface FeeStatistics {
  term: {
    id: string;
    name: string;
  };

  totalStudents: number;
  studentsWithFees: number;
  studentsFullyPaid: number;
  studentsPartiallyPaid: number;
  studentsPending: number;
  studentsOverdue: number;

  financials: {
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
    totalWaived: number;
    collectionRate: number;
  };

  recentPayments: Payment[];
  topDefaulters: Defaulter[];
}

/**
 * Payment Gateway Settings (Multi-tenant secure storage)
 */
export interface PaymentGatewaySettings {
  id: string;
  tenantId: string;

  // Paystack Configuration
  paystack: {
    enabled: boolean;
    publicKey: string;
    secretKey: string; // Encrypted in storage
    webhookUrl?: string;
  };

  // Flutterwave Configuration
  flutterwave: {
    enabled: boolean;
    publicKey: string;
    secretKey: string; // Encrypted in storage
    webhookUrl?: string;
  };

  // Bank Transfer Configuration
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountName: string;
    accountNumber: string;
    instructions?: string; // Custom instructions for parents
  };

  // Default payment method
  defaultPaymentMethod: 'paystack' | 'flutterwave' | 'bank_transfer';

  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  updatedBy: string;
}

/**
 * Pending Payment (Bank Transfer awaiting approval)
 */
export interface PendingPayment {
  id: string;
  tenantId: string;
  studentFeeId: string;
  studentId: string;
  studentName: string;
  guardianId: string;
  guardianName: string;

  // Payment details
  amount: number;
  paymentMethod: 'bank_transfer';
  proofOfPaymentUrl: string; // URL to uploaded image/PDF
  paymentDate: Date | Timestamp; // Date parent claims they paid
  transactionReference?: string; // Bank reference if provided

  // Bank details used
  bankName?: string;
  accountNumber?: string;

  // Review status
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date | Timestamp;
  reviewNotes?: string;

  // If approved, link to generated payment record
  paymentId?: string;

  // Metadata
  submittedAt: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Online Payment Transaction (Paystack/Flutterwave)
 */
export interface OnlinePaymentTransaction {
  id: string;
  tenantId: string;
  studentFeeId: string;
  studentId: string;
  guardianId: string;

  // Gateway details
  gateway: 'paystack' | 'flutterwave';
  transactionReference: string; // Gateway transaction reference
  authorizationUrl?: string; // Payment URL (before completion)

  // Payment details
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'abandoned';

  // Gateway response
  gatewayResponse?: any; // Full response from gateway
  paidAt?: Date | Timestamp;

  // If successful, link to generated payment record
  paymentId?: string;

  // Metadata
  initiatedAt: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
