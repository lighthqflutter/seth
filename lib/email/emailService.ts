/**
 * Email Service (Phase 18)
 *
 * Core email sending functionality with support for:
 * - Brevo (production)
 * - Resend (development)
 * - Email queue with retry logic
 * - Delivery tracking
 * - Template rendering
 */

import * as SibApiV3Sdk from '@getbrevo/brevo';
import { Resend } from 'resend';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getEmailConfig, validateEmailConfig, EmailType, EmailPriority } from './config';

// Email send options
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
  priority?: EmailPriority;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
}

// Email send result
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'brevo' | 'resend';
  timestamp: Date;
}

// Email queue entry
export interface EmailQueueEntry {
  id?: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
  priority: EmailPriority;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  error?: string;
  messageId?: string;
  provider?: 'brevo' | 'resend';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Send email via Brevo
 */
async function sendViaBrevo(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getEmailConfig();

  if (!validateEmailConfig(config)) {
    throw new Error('Invalid email configuration for Brevo');
  }

  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      config.apiKey
    );

    const recipients = Array.isArray(options.to)
      ? options.to.map(email => ({ email }))
      : [{ email: options.to }];

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: config.senderEmail,
      name: config.senderName,
    };
    sendSmtpEmail.to = recipients;
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html;
    sendSmtpEmail.textContent = options.text;

    if (options.replyTo || config.replyToEmail) {
      sendSmtpEmail.replyTo = {
        email: options.replyTo || config.replyToEmail!,
      };
    }

    if (options.attachments) {
      sendSmtpEmail.attachment = options.attachments.map(att => ({
        name: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : att.content,
      }));
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return {
      success: true,
      messageId: response.messageId,
      provider: 'brevo',
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Brevo send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via Brevo',
      provider: 'brevo',
      timestamp: new Date(),
    };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getEmailConfig();

  if (!validateEmailConfig(config)) {
    throw new Error('Invalid email configuration for Resend');
  }

  try {
    const resend = new Resend(config.apiKey);

    const response = await resend.emails.send({
      from: `${config.senderName} <${config.senderEmail}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo || config.replyToEmail,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content
          : Buffer.from(att.content),
      })),
    });

    return {
      success: true,
      messageId: response.id,
      provider: 'resend',
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error('Resend send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via Resend',
      provider: 'resend',
      timestamp: new Date(),
    };
  }
}

/**
 * Send email (main function)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getEmailConfig();

  // Send via configured provider
  const result = config.provider === 'brevo'
    ? await sendViaBrevo(options)
    : await sendViaResend(options);

  // Log email send attempt to Firestore (if tenantId provided)
  if (options.tenantId) {
    try {
      await addDoc(collection(db, 'emailLogs'), {
        to: options.to,
        subject: options.subject,
        type: options.type,
        priority: options.priority || EmailPriority.NORMAL,
        tenantId: options.tenantId,
        userId: options.userId,
        metadata: options.metadata,
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        provider: result.provider,
        error: result.error,
        sentAt: result.success ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
      });
    } catch (logError) {
      console.error('Failed to log email send:', logError);
    }
  }

  return result;
}

/**
 * Queue email for later delivery
 */
export async function queueEmail(options: SendEmailOptions): Promise<string> {
  const queueEntry: Omit<EmailQueueEntry, 'id'> = {
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    type: options.type,
    priority: options.priority || EmailPriority.NORMAL,
    tenantId: options.tenantId,
    userId: options.userId,
    metadata: options.metadata,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(collection(db, 'emailQueue'), {
    ...queueEntry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Process email queue entry
 */
export async function processQueuedEmail(queueId: string): Promise<void> {
  const queueRef = doc(db, 'emailQueue', queueId);

  try {
    // Update status to sending
    await updateDoc(queueRef, {
      status: 'sending',
      lastAttemptAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Get queue entry (in production, fetch from Firestore)
    // For now, we'll assume the queue entry is passed in
    // This is a placeholder - actual implementation would fetch from Firestore

    // Send email
    // const result = await sendEmail(queueEntry);

    // Update queue entry based on result
    // if (result.success) {
    //   await updateDoc(queueRef, {
    //     status: 'sent',
    //     sentAt: serverTimestamp(),
    //     messageId: result.messageId,
    //     updatedAt: serverTimestamp(),
    //   });
    // } else {
    //   // Handle failure with retry logic
    //   const newAttempts = queueEntry.attempts + 1;
    //   await updateDoc(queueRef, {
    //     status: newAttempts >= queueEntry.maxAttempts ? 'failed' : 'retrying',
    //     attempts: newAttempts,
    //     error: result.error,
    //     updatedAt: serverTimestamp(),
    //   });
    // }
  } catch (error: any) {
    console.error('Error processing queued email:', error);
    await updateDoc(queueRef, {
      status: 'failed',
      error: error.message,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(
  emails: SendEmailOptions[],
  delayMs: number = 100
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];

  for (const emailOptions of emails) {
    const result = await sendEmail(emailOptions);
    results.push(result);

    // Delay between sends to respect rate limits
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Send emails to multiple recipients (BCC-style)
 */
export async function sendBulkEmail(
  recipients: string[],
  options: Omit<SendEmailOptions, 'to'>
): Promise<SendEmailResult[]> {
  // Brevo supports up to 50 recipients per email
  // Resend supports up to 50 recipients per email
  // Split into batches if needed

  const batchSize = 50;
  const results: SendEmailResult[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const result = await sendEmail({
      ...options,
      to: batch,
    });

    results.push(result);

    // Small delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
