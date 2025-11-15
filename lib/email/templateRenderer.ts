/**
 * Email Template Renderer (Phase 18)
 *
 * Renders React Email templates to HTML
 * Provides helper functions for sending common emails
 */

import { render } from '@react-email/components';
import { sendEmail, SendEmailOptions } from './emailService';
import { EmailType, EmailPriority } from './config';

// Import templates
import { SchoolWelcomeEmail, SchoolWelcomeEmailProps } from './templates/SchoolWelcomeEmail';
import { UserWelcomeEmail, UserWelcomeEmailProps } from './templates/UserWelcomeEmail';
import { PasswordResetEmail, PasswordResetEmailProps } from './templates/PasswordResetEmail';
import { ResultsPublishedEmail, ResultsPublishedEmailProps } from './templates/ResultsPublishedEmail';
import { FeeReminderEmail, FeeReminderEmailProps } from './templates/FeeReminderEmail';
import { AnnouncementEmail, AnnouncementEmailProps } from './templates/AnnouncementEmail';

/**
 * Render React Email template to HTML
 */
export async function renderTemplate(
  template: React.ReactElement
): Promise<{ html: string; text: string }> {
  const html = await render(template);

  // Generate plain text version (simple HTML stripping)
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { html, text };
}

/**
 * Send School Welcome Email
 */
export async function sendSchoolWelcomeEmail(
  to: string,
  props: SchoolWelcomeEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(SchoolWelcomeEmail(props));

  const emailOptions: SendEmailOptions = {
    to,
    subject: `Welcome to Cedars School Portal - ${props.schoolName}`,
    html,
    text,
    type: EmailType.SCHOOL_WELCOME,
    priority: EmailPriority.HIGH,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      schoolName: props.schoolName,
      plan: props.plan,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Send User Welcome Email
 */
export async function sendUserWelcomeEmail(
  to: string,
  props: UserWelcomeEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(UserWelcomeEmail(props));

  const typeMap = {
    student: EmailType.STUDENT_WELCOME,
    teacher: EmailType.TEACHER_WELCOME,
    parent: EmailType.PARENT_WELCOME,
  };

  const emailOptions: SendEmailOptions = {
    to,
    subject: `Welcome to ${props.schoolName} - Your ${props.userType.charAt(0).toUpperCase() + props.userType.slice(1)} Account`,
    html,
    text,
    type: typeMap[props.userType],
    priority: EmailPriority.HIGH,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      userType: props.userType,
      schoolName: props.schoolName,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail(
  to: string,
  props: PasswordResetEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(PasswordResetEmail(props));

  const emailOptions: SendEmailOptions = {
    to,
    subject: `Reset Your Password - ${props.schoolName}`,
    html,
    text,
    type: EmailType.PASSWORD_RESET,
    priority: EmailPriority.HIGH,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      expiryMinutes: props.expiryMinutes,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Send Results Published Email
 */
export async function sendResultsPublishedEmail(
  to: string | string[],
  props: ResultsPublishedEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(ResultsPublishedEmail(props));

  const emailOptions: SendEmailOptions = {
    to,
    subject: `New Results Published - ${props.schoolName}`,
    html,
    text,
    type: EmailType.RESULTS_PUBLISHED,
    priority: EmailPriority.NORMAL,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      studentCount: props.results.length,
      schoolName: props.schoolName,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Send Fee Reminder Email
 */
export async function sendFeeReminderEmail(
  to: string,
  props: FeeReminderEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(FeeReminderEmail(props));

  const emailOptions: SendEmailOptions = {
    to,
    subject: `Fee Payment Reminder - ${props.studentName}`,
    html,
    text,
    type: EmailType.FEE_REMINDER,
    priority: EmailPriority.NORMAL,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      studentName: props.studentName,
      totalAmount: props.totalAmount,
      dueDate: props.dueDate,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Send Announcement/Newsletter Email
 */
export async function sendAnnouncementEmail(
  to: string | string[],
  props: AnnouncementEmailProps,
  options?: { tenantId?: string; userId?: string }
) {
  const { html, text } = await renderTemplate(AnnouncementEmail(props));

  const emailOptions: SendEmailOptions = {
    to,
    subject: `${props.title} - ${props.schoolName}`,
    html,
    text,
    type: props.priority === 'high' ? EmailType.ANNOUNCEMENT : EmailType.NEWSLETTER,
    priority: props.priority === 'high' ? EmailPriority.HIGH : EmailPriority.LOW,
    tenantId: options?.tenantId,
    userId: options?.userId,
    metadata: {
      announcementTitle: props.title,
      sectionCount: props.sections.length,
    },
  };

  return await sendEmail(emailOptions);
}

/**
 * Batch send results to multiple parents
 */
export async function batchSendResultsEmails(
  recipients: Array<{
    email: string;
    props: ResultsPublishedEmailProps;
  }>,
  options?: { tenantId?: string; delayMs?: number }
): Promise<void> {
  for (const recipient of recipients) {
    await sendResultsPublishedEmail(recipient.email, recipient.props, {
      tenantId: options?.tenantId,
    });

    // Delay to respect rate limits
    if (options?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }
}

/**
 * Batch send fee reminders to multiple parents
 */
export async function batchSendFeeReminders(
  recipients: Array<{
    email: string;
    props: FeeReminderEmailProps;
  }>,
  options?: { tenantId?: string; delayMs?: number }
): Promise<void> {
  for (const recipient of recipients) {
    await sendFeeReminderEmail(recipient.email, recipient.props, {
      tenantId: options?.tenantId,
    });

    // Delay to respect rate limits
    if (options?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }
}
