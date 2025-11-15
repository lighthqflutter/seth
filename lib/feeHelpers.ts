/**
 * Fee Management Helper Functions
 * Phase 23: Fee Management System
 */

import {
  FeeStructureItem,
  StudentFee,
  Payment,
  PaymentStatus,
  Defaulter,
  PaymentSummary,
  FeeConfiguration,
} from '@/types/fees';

/**
 * Calculate final amount for a student fee
 * Takes into account discounts, waivers, and penalties
 */
export function calculateFinalAmount(
  baseAmount: number,
  options: {
    discountAmount?: number;
    waiverAmount?: number;
    latePenaltyAmount?: number;
    latePenaltyPercentage?: number;
    isOverdue?: boolean;
  }
): number {
  let finalAmount = baseAmount;

  // Apply discount
  if (options.discountAmount) {
    finalAmount -= options.discountAmount;
  }

  // Apply waiver
  if (options.waiverAmount) {
    finalAmount -= options.waiverAmount;
  }

  // Apply late penalty if overdue
  if (options.isOverdue) {
    if (options.latePenaltyAmount) {
      finalAmount += options.latePenaltyAmount;
    } else if (options.latePenaltyPercentage) {
      finalAmount += (baseAmount * options.latePenaltyPercentage) / 100;
    }
  }

  return Math.max(0, Math.round(finalAmount * 100) / 100); // Ensure non-negative, round to 2 decimals
}

/**
 * Calculate outstanding amount
 */
export function calculateOutstanding(finalAmount: number, amountPaid: number): number {
  return Math.max(0, Math.round((finalAmount - amountPaid) * 100) / 100);
}

/**
 * Determine payment status
 */
export function determinePaymentStatus(
  finalAmount: number,
  amountPaid: number,
  isOverdue: boolean,
  isWaived: boolean = false
): PaymentStatus {
  if (isWaived && amountPaid === 0) {
    return 'waived';
  }

  const outstanding = calculateOutstanding(finalAmount, amountPaid);

  if (outstanding === 0) {
    return 'paid';
  }

  if (amountPaid > 0 && outstanding > 0) {
    return 'partial';
  }

  if (isOverdue) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Check if a fee is overdue
 */
export function isOverdue(dueDate: Date, gracePeriodDays: number = 0): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  // Add grace period
  due.setDate(due.getDate() + gracePeriodDays);

  return today > due;
}

/**
 * Calculate days past due
 */
export function daysPastDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (today <= due) {
    return 0;
  }

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Generate receipt number
 */
export function generateReceiptNumber(
  prefix: string,
  numberLength: number,
  nextNumber: number
): string {
  const paddedNumber = String(nextNumber).padStart(numberLength, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'NGN',
  locale: string = 'en-NG'
): string {
  const currencyMap: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };

  const symbol = currencyMap[currency] || currency;

  // Format with thousands separator
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formatted}`;
}

/**
 * Calculate payment summary
 */
export function calculatePaymentSummary(studentFees: StudentFee[]): {
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  totalWaived: number;
  totalOverdue: number;
} {
  const summary = {
    totalExpected: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalWaived: 0,
    totalOverdue: 0,
  };

  studentFees.forEach((fee) => {
    summary.totalExpected += fee.finalAmount;
    summary.totalPaid += fee.amountPaid;
    summary.totalOutstanding += fee.amountOutstanding;

    if (fee.status === 'waived') {
      summary.totalWaived += fee.finalAmount;
    }

    if (fee.isOverdue) {
      summary.totalOverdue += fee.amountOutstanding;
    }
  });

  return summary;
}

/**
 * Get color for payment status
 */
export function getStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    paid: '#10b981', // green
    partial: '#f59e0b', // yellow
    pending: '#6b7280', // gray
    overdue: '#ef4444', // red
    waived: '#3b82f6', // blue
  };

  return colors[status];
}

/**
 * Get status badge color classes
 */
export function getStatusBadgeClass(status: PaymentStatus): string {
  const classes: Record<PaymentStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
    overdue: 'bg-red-100 text-red-800',
    waived: 'bg-blue-100 text-blue-800',
  };

  return classes[status];
}

/**
 * Calculate collection rate
 */
export function calculateCollectionRate(totalExpected: number, totalPaid: number): number {
  if (totalExpected === 0) {
    return 0;
  }

  return Math.round((totalPaid / totalExpected) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Get payment method display name
 */
export function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    pos: 'POS',
    online_paystack: 'Paystack',
    online_flutterwave: 'Flutterwave',
    online_stripe: 'Stripe',
    other: 'Other',
  };

  return names[method] || method;
}

/**
 * Get fee type display name
 */
export function getFeeTypeName(feeType: string): string {
  const names: Record<string, string> = {
    tuition: 'Tuition',
    registration: 'Registration',
    books: 'Books',
    uniform: 'Uniform',
    transport: 'Transport',
    lunch: 'Lunch',
    sports: 'Sports',
    examination: 'Examination',
    lab: 'Laboratory',
    library: 'Library',
    hostel: 'Hostel',
    development: 'Development Levy',
    pta: 'PTA',
    excursion: 'Excursion',
    technology: 'Technology',
    other: 'Other',
  };

  return names[feeType] || feeType;
}

/**
 * Sort defaulters by amount or days overdue
 */
export function sortDefaulters(
  defaulters: Defaulter[],
  sortBy: 'amount' | 'days' = 'amount',
  order: 'asc' | 'desc' = 'desc'
): Defaulter[] {
  return [...defaulters].sort((a, b) => {
    const aValue = sortBy === 'amount' ? a.overdueAmount : a.daysPastDue;
    const bValue = sortBy === 'amount' ? b.overdueAmount : b.daysPastDue;

    if (order === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

/**
 * Filter fees by criteria
 */
export function filterFees(
  fees: StudentFee[],
  filters: {
    status?: PaymentStatus[];
    classId?: string;
    termId?: string;
    isOverdue?: boolean;
    minAmount?: number;
    maxAmount?: number;
  }
): StudentFee[] {
  return fees.filter((fee) => {
    if (filters.status && !filters.status.includes(fee.status)) {
      return false;
    }

    if (filters.classId && fee.classId !== filters.classId) {
      return false;
    }

    if (filters.termId && fee.termId !== filters.termId) {
      return false;
    }

    if (filters.isOverdue !== undefined && fee.isOverdue !== filters.isOverdue) {
      return false;
    }

    if (filters.minAmount !== undefined && fee.finalAmount < filters.minAmount) {
      return false;
    }

    if (filters.maxAmount !== undefined && fee.finalAmount > filters.maxAmount) {
      return false;
    }

    return true;
  });
}

/**
 * Group payments by date
 */
export function groupPaymentsByDate(payments: Payment[]): Record<string, Payment[]> {
  const grouped: Record<string, Payment[]> = {};

  payments.forEach((payment) => {
    const date =
      payment.paymentDate instanceof Date
        ? payment.paymentDate
        : payment.paymentDate.toDate();
    const dateKey = date.toISOString().split('T')[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(payment);
  });

  return grouped;
}

/**
 * Calculate installment schedule
 */
export function calculateInstallmentSchedule(
  totalAmount: number,
  numberOfInstallments: number,
  firstDueDate: Date,
  intervalDays: number = 30
): Array<{ installmentNumber: number; amount: number; dueDate: Date }> {
  const installments = [];
  const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100;
  let remainingAmount = totalAmount;

  for (let i = 1; i <= numberOfInstallments; i++) {
    // Last installment takes the remaining amount to handle rounding
    const amount = i === numberOfInstallments ? remainingAmount : baseAmount;
    remainingAmount -= amount;

    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + intervalDays * (i - 1));

    installments.push({
      installmentNumber: i,
      amount: Math.round(amount * 100) / 100,
      dueDate,
    });
  }

  return installments;
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(
  amount: number,
  outstandingAmount: number
): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Payment amount must be greater than zero' };
  }

  if (amount > outstandingAmount) {
    return {
      isValid: false,
      error: `Payment amount cannot exceed outstanding amount of ${formatCurrency(outstandingAmount)}`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate early payment discount
 */
export function calculateEarlyDiscount(
  baseAmount: number,
  discountPercentage: number,
  paymentDate: Date,
  discountDeadline: Date
): number {
  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);

  const deadline = new Date(discountDeadline);
  deadline.setHours(0, 0, 0, 0);

  if (payment <= deadline) {
    return Math.round((baseAmount * discountPercentage) / 100 * 100) / 100;
  }

  return 0;
}

/**
 * Export helper - Convert fees to CSV
 */
export function feesToCSV(
  fees: StudentFee[],
  students: Map<string, { name: string; admissionNumber: string; className: string }>
): string {
  const headers = [
    'Student Name',
    'Admission Number',
    'Class',
    'Fee Type',
    'Amount',
    'Paid',
    'Outstanding',
    'Status',
    'Due Date',
  ];

  const rows = fees.map((fee) => {
    const student = students.get(fee.studentId);
    return [
      student?.name || 'Unknown',
      student?.admissionNumber || 'N/A',
      student?.className || 'N/A',
      getFeeTypeName(fee.feeType),
      fee.finalAmount.toFixed(2),
      fee.amountPaid.toFixed(2),
      fee.amountOutstanding.toFixed(2),
      fee.status.toUpperCase(),
      fee.dueDate instanceof Date
        ? fee.dueDate.toLocaleDateString()
        : fee.dueDate.toDate().toLocaleDateString(),
    ];
  });

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}
