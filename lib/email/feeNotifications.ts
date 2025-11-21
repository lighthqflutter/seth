/**
 * Fee Notification Service
 * Sends fee-related emails using SMTP
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  getFeeAssignmentEmail,
  getPaymentReceiptEmail,
  getBankTransferSubmissionNotification,
  getBankTransferApprovalEmail,
  getBankTransferRejectionEmail,
} from './feeEmailTemplates';

// SMTP Configuration
const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sh004.webhostbox.net',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // Use SSL
    auth: {
      user: process.env.SMTP_USER || 'notify@seth.com.ng',
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using SMTP
 */
const sendEmail = async (
  to: string | string[],
  subject: string,
  html: string,
  options?: {
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  }
): Promise<EmailResult> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SETH Portal" <${process.env.SMTP_USER || 'notify@seth.com.ng'}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      cc: options?.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(', ')
          : options.cc
        : undefined,
      bcc: options?.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(', ')
          : options.bcc
        : undefined,
      replyTo: options?.replyTo,
    };

    console.log('Sending fee notification email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);

    console.log('Fee notification email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Failed to send fee notification email:', {
      error: error.message,
      to,
      subject,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send fee assignment notification to parent
 */
export const sendFeeAssignmentNotification = async (params: {
  parentEmail: string;
  parentName: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName?: string;
  };
  fee: {
    feeName: string;
    amount: number;
    dueDate: Date;
    description?: string;
  };
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}): Promise<EmailResult> => {
  const { subject, html } = getFeeAssignmentEmail(
    params.school,
    params.student,
    params.fee,
    params.parentName
  );

  return sendEmail(params.parentEmail, subject, html, {
    replyTo: params.school.email,
  });
};

/**
 * Send payment receipt email to parent
 */
export const sendPaymentReceiptNotification = async (params: {
  parentEmail: string;
  parentName: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName?: string;
  };
  payment: {
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    feeName: string;
    balanceRemaining: number;
  };
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}): Promise<EmailResult> => {
  const { subject, html } = getPaymentReceiptEmail(
    params.school,
    params.student,
    params.payment,
    params.parentName
  );

  return sendEmail(params.parentEmail, subject, html, {
    replyTo: params.school.email,
  });
};

/**
 * Send bank transfer submission notification to finance team
 */
export const sendBankTransferSubmissionNotification = async (params: {
  financeEmails: string[];
  parentName: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName?: string;
  };
  transfer: {
    amount: number;
    feeName: string;
    fileName: string;
    submittedAt: Date;
  };
  submissionId: string;
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}): Promise<EmailResult> => {
  const { subject, html } = getBankTransferSubmissionNotification(
    params.school,
    params.student,
    params.transfer,
    params.parentName,
    params.submissionId
  );

  return sendEmail(params.financeEmails, subject, html);
};

/**
 * Send bank transfer approval email to parent
 */
export const sendBankTransferApprovalNotification = async (params: {
  parentEmail: string;
  parentName: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName?: string;
  };
  payment: {
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    feeName: string;
    balanceRemaining: number;
  };
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}): Promise<EmailResult> => {
  const { subject, html } = getBankTransferApprovalEmail(
    params.school,
    params.student,
    params.payment,
    params.parentName
  );

  return sendEmail(params.parentEmail, subject, html, {
    replyTo: params.school.email,
  });
};

/**
 * Send bank transfer rejection email to parent
 */
export const sendBankTransferRejectionNotification = async (params: {
  parentEmail: string;
  parentName: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    currentClassName?: string;
  };
  transfer: {
    amount: number;
    feeName: string;
    fileName: string;
    submittedAt: Date;
  };
  rejectionReason: string;
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}): Promise<EmailResult> => {
  const { subject, html } = getBankTransferRejectionEmail(
    params.school,
    params.student,
    params.transfer,
    params.parentName,
    params.rejectionReason
  );

  return sendEmail(params.parentEmail, subject, html, {
    replyTo: params.school.email,
  });
};
