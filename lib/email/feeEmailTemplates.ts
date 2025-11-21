/**
 * Fee Management Email Templates
 * Templates for fee assignment, payment receipts, and bank transfer notifications
 */

import { formatCurrency } from '@/lib/feeHelpers';

interface SchoolInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassName?: string;
}

interface FeeInfo {
  feeName: string;
  amount: number;
  dueDate: Date;
  description?: string;
}

interface PaymentInfo {
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  feeName: string;
  balanceRemaining: number;
}

interface BankTransferInfo {
  amount: number;
  feeName: string;
  fileName: string;
  submittedAt: Date;
}

/**
 * Generate email header with school branding
 */
const getEmailHeader = (school: SchoolInfo) => `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
    ${school.logo ? `<img src="${school.logo}" alt="${school.name}" style="max-height: 60px; margin-bottom: 15px;" />` : ''}
    <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${school.name}</h1>
    ${school.address ? `<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${school.address}</p>` : ''}
  </div>
`;

/**
 * Generate email footer
 */
const getEmailFooter = (school: SchoolInfo) => `
  <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0 0 10px 0;">
      <strong>${school.name}</strong>
    </p>
    ${school.phone || school.email ? `
      <p style="margin: 0 0 10px 0;">
        ${school.phone ? `Phone: ${school.phone}` : ''}
        ${school.phone && school.email ? ' | ' : ''}
        ${school.email ? `Email: ${school.email}` : ''}
      </p>
    ` : ''}
    <p style="margin: 0; font-size: 12px;">
      This is an automated email. Please do not reply directly to this message.
    </p>
  </div>
`;

/**
 * Base email template
 */
const getBaseTemplate = (school: SchoolInfo, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Notification - ${school.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td>
              ${getEmailHeader(school)}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooter(school)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Fee Assignment Notification Email
 * Sent to parents when a new fee is assigned to their child
 */
export const getFeeAssignmentEmail = (
  school: SchoolInfo,
  student: StudentInfo,
  fee: FeeInfo,
  parentName: string
) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1f2937;">New Fee Assigned</h2>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
      Dear ${parentName},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
      A new fee has been assigned to <strong>${student.firstName} ${student.lastName}</strong> (${student.admissionNumber}${student.currentClassName ? `, ${student.currentClassName}` : ''}).
    </p>

    <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Fee Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Fee Name:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${fee.feeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #10b981; font-weight: 700; text-align: right;">${formatCurrency(fee.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Due Date:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #ef4444; font-weight: 600; text-align: right;">${fee.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${fee.description ? `
        <tr>
          <td colspan="2" style="padding: 12px 0 0 0; font-size: 14px; color: #4b5563;">
            ${fee.description}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background: #dbeafe; border-radius: 6px; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>💡 Payment Options:</strong> You can pay online using Paystack or Flutterwave, or submit proof of bank transfer through the parent portal.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0 0 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
        View and Pay Fee
      </a>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
      Please ensure payment is made on or before the due date to avoid any inconvenience.
    </p>
  `;

  return {
    subject: `New Fee Assigned: ${fee.feeName} - ${school.name}`,
    html: getBaseTemplate(school, content),
  };
};

/**
 * Payment Receipt Email
 * Sent to parents after successful payment (Paystack/Flutterwave)
 */
export const getPaymentReceiptEmail = (
  school: SchoolInfo,
  student: StudentInfo,
  payment: PaymentInfo,
  parentName: string
) => {
  const content = `
    <div style="text-align: center; margin: 0 0 25px 0;">
      <div style="display: inline-block; background: #10b981; color: white; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; margin-bottom: 15px;">
        ✓
      </div>
      <h2 style="margin: 0; font-size: 24px; color: #1f2937;">Payment Successful!</h2>
    </div>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
      Dear ${parentName},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
      Thank you for your payment. We have successfully received your payment for <strong>${student.firstName} ${student.lastName}</strong>.
    </p>

    <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
      <div style="font-size: 14px; color: #065f46; margin-bottom: 8px;">Receipt Number</div>
      <div style="font-size: 24px; font-weight: 700; color: #047857; font-family: 'Courier New', monospace;">${payment.receiptNumber}</div>
    </div>

    <div style="background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Student:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.firstName} ${student.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Admission Number:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.admissionNumber}</td>
        </tr>
        ${student.currentClassName ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Class:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.currentClassName}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid #d1d5db;">
          <td style="padding: 12px 0 8px 0; font-size: 14px; color: #6b7280;">Fee Name:</td>
          <td style="padding: 12px 0 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${payment.feeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #10b981; font-weight: 700; text-align: right;">${formatCurrency(payment.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Method:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${payment.paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Date:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${payment.paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${payment.balanceRemaining > 0 ? `
        <tr style="border-top: 1px solid #d1d5db;">
          <td style="padding: 12px 0 0 0; font-size: 14px; color: #6b7280;">Balance Remaining:</td>
          <td style="padding: 12px 0 0 0; font-size: 16px; color: #ef4444; font-weight: 700; text-align: right;">${formatCurrency(payment.balanceRemaining)}</td>
        </tr>
        ` : `
        <tr style="border-top: 1px solid #d1d5db;">
          <td colspan="2" style="padding: 15px; background: #d1fae5; text-align: center; border-radius: 4px; margin-top: 10px;">
            <span style="font-size: 16px; color: #065f46; font-weight: 600;">✓ FULLY PAID</span>
          </td>
        </tr>
        `}
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0 0 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees/receipts/${payment.receiptNumber}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-right: 10px;">
        Download Receipt
      </a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees"
         style="display: inline-block; background: white; color: #667eea; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; border: 2px solid #667eea;">
        View All Fees
      </a>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
      Please keep this receipt for your records. You can also download it from the parent portal anytime.
    </p>
  `;

  return {
    subject: `Payment Receipt - ${payment.receiptNumber} - ${school.name}`,
    html: getBaseTemplate(school, content),
  };
};

/**
 * Bank Transfer Submission Notification (to Finance)
 * Sent to finance team when a parent submits bank transfer proof
 */
export const getBankTransferSubmissionNotification = (
  school: SchoolInfo,
  student: StudentInfo,
  transfer: BankTransferInfo,
  parentName: string,
  submissionId: string
) => {
  const content = `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; color: #92400e; font-weight: 600;">
        ⚠️ Action Required: New Bank Transfer Pending Review
      </p>
    </div>

    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1f2937;">Bank Transfer Proof Submitted</h2>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
      A parent has submitted proof of bank transfer payment that requires your review and approval.
    </p>

    <div style="background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Submission Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Submitted By:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${parentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Student:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.firstName} ${student.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Admission Number:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.admissionNumber}</td>
        </tr>
        ${student.currentClassName ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Class:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${student.currentClassName}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid #d1d5db;">
          <td style="padding: 12px 0 8px 0; font-size: 14px; color: #6b7280;">Fee Name:</td>
          <td style="padding: 12px 0 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${transfer.feeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #3b82f6; font-weight: 700; text-align: right;">${formatCurrency(transfer.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Submitted At:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${transfer.submittedAt.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Proof Document:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${transfer.fileName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0 0 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/dashboard/fees/bank-transfers"
         style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
        Review Submission
      </a>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
      Please review the submitted proof of payment and approve or reject the submission as appropriate.
    </p>
  `;

  return {
    subject: `New Bank Transfer Submission - ${student.firstName} ${student.lastName} - ${school.name}`,
    html: getBaseTemplate(school, content),
  };
};

/**
 * Bank Transfer Approval Email (to Parent)
 * Sent to parent when their bank transfer is approved
 */
export const getBankTransferApprovalEmail = (
  school: SchoolInfo,
  student: StudentInfo,
  payment: PaymentInfo,
  parentName: string
) => {
  const content = `
    <div style="text-align: center; margin: 0 0 25px 0;">
      <div style="display: inline-block; background: #10b981; color: white; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; margin-bottom: 15px;">
        ✓
      </div>
      <h2 style="margin: 0; font-size: 24px; color: #1f2937;">Bank Transfer Approved!</h2>
    </div>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
      Dear ${parentName},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
      Great news! Your bank transfer payment has been verified and approved by our finance team. The payment has been recorded for <strong>${student.firstName} ${student.lastName}</strong>.
    </p>

    <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
      <div style="font-size: 14px; color: #065f46; margin-bottom: 8px;">Receipt Number</div>
      <div style="font-size: 24px; font-weight: 700; color: #047857; font-family: 'Courier New', monospace;">${payment.receiptNumber}</div>
    </div>

    <div style="background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Fee Name:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${payment.feeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 8px 0; font-size: 18px; color: #10b981; font-weight: 700; text-align: right;">${formatCurrency(payment.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Approved On:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${payment.paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        ${payment.balanceRemaining > 0 ? `
        <tr style="border-top: 1px solid #d1d5db;">
          <td style="padding: 12px 0 0 0; font-size: 14px; color: #6b7280;">Balance Remaining:</td>
          <td style="padding: 12px 0 0 0; font-size: 16px; color: #ef4444; font-weight: 700; text-align: right;">${formatCurrency(payment.balanceRemaining)}</td>
        </tr>
        ` : `
        <tr style="border-top: 1px solid #d1d5db;">
          <td colspan="2" style="padding: 15px; background: #d1fae5; text-align: center; border-radius: 4px; margin-top: 10px;">
            <span style="font-size: 16px; color: #065f46; font-weight: 600;">✓ FULLY PAID</span>
          </td>
        </tr>
        `}
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0 0 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees/receipts/${payment.receiptNumber}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-right: 10px;">
        Download Receipt
      </a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees"
         style="display: inline-block; background: white; color: #667eea; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; border: 2px solid #667eea;">
        View All Fees
      </a>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
      Thank you for your payment. Your official receipt is now available to download.
    </p>
  `;

  return {
    subject: `Payment Approved - ${payment.receiptNumber} - ${school.name}`,
    html: getBaseTemplate(school, content),
  };
};

/**
 * Bank Transfer Rejection Email (to Parent)
 * Sent to parent when their bank transfer is rejected
 */
export const getBankTransferRejectionEmail = (
  school: SchoolInfo,
  student: StudentInfo,
  transfer: BankTransferInfo,
  parentName: string,
  rejectionReason: string
) => {
  const content = `
    <div style="text-align: center; margin: 0 0 25px 0;">
      <div style="display: inline-block; background: #ef4444; color: white; width: 64px; height: 64px; border-radius: 50%; line-height: 64px; font-size: 32px; margin-bottom: 15px;">
        ✕
      </div>
      <h2 style="margin: 0; font-size: 24px; color: #1f2937;">Bank Transfer Not Approved</h2>
    </div>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
      Dear ${parentName},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
      We regret to inform you that your bank transfer payment submission for <strong>${student.firstName} ${student.lastName}</strong> could not be verified and has been rejected by our finance team.
    </p>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #991b1b;">Reason for Rejection:</h3>
      <p style="margin: 0; font-size: 15px; color: #7f1d1d; line-height: 1.6;">
        ${rejectionReason}
      </p>
    </div>

    <div style="background: #f3f4f6; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Submission Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Fee Name:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${transfer.feeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount:</td>
          <td style="padding: 8px 0; font-size: 16px; color: #3b82f6; font-weight: 700; text-align: right;">${formatCurrency(transfer.amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Submitted On:</td>
          <td style="padding: 8px 0; font-size: 14px; color: #1f2937; font-weight: 600; text-align: right;">${transfer.submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>

    <div style="background: #dbeafe; border-radius: 6px; padding: 15px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
        <strong>What to do next:</strong> Please review the rejection reason and submit a new proof of payment with the correct information, or contact the finance office for clarification.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0 0 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/parent/fees"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
        Submit New Proof
      </a>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
      If you have any questions, please contact our finance office at ${school.email || school.phone || 'the school'}.
    </p>
  `;

  return {
    subject: `Bank Transfer Rejected - ${transfer.feeName} - ${school.name}`,
    html: getBaseTemplate(school, content),
  };
};
