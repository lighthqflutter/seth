/**
 * Email Service Configuration (Phase 18)
 *
 * Supports Brevo (recommended for production) and Resend (dev-friendly)
 * Based on EMAIL_API_BUSINESS_CASE.md analysis
 */

export interface EmailConfig {
  provider: 'brevo' | 'resend';
  apiKey: string;
  senderEmail: string;
  senderName: string;
  replyToEmail?: string;
}

export interface EmailProvider {
  name: string;
  monthlyLimit: number;
  dailyLimit?: number;
  cost: string;
}

export const EMAIL_PROVIDERS: Record<string, EmailProvider> = {
  brevo: {
    name: 'Brevo',
    monthlyLimit: 9000, // Free tier: 300 emails/day = 9,000/month
    dailyLimit: 300,
    cost: 'Free (9,000/month)',
  },
  resend: {
    name: 'Resend',
    monthlyLimit: 3000, // Free tier: 100 emails/day = 3,000/month
    dailyLimit: 100,
    cost: 'Free (3,000/month)',
  },
};

export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'brevo') as 'brevo' | 'resend';

  return {
    provider,
    apiKey: provider === 'brevo'
      ? process.env.BREVO_API_KEY || ''
      : process.env.RESEND_API_KEY || '',
    senderEmail: process.env.EMAIL_SENDER_EMAIL || 'noreply@cedarsportal.com.ng',
    senderName: process.env.EMAIL_SENDER_NAME || 'Cedars School Portal',
    replyToEmail: process.env.EMAIL_REPLY_TO,
  };
}

export function validateEmailConfig(config: EmailConfig): boolean {
  if (!config.apiKey) {
    console.error(`Missing API key for ${config.provider}`);
    return false;
  }

  if (!config.senderEmail) {
    console.error('Missing sender email address');
    return false;
  }

  return true;
}

// Email types for tracking and analytics
export enum EmailType {
  // Onboarding
  SCHOOL_WELCOME = 'school_welcome',
  STUDENT_WELCOME = 'student_welcome',
  TEACHER_WELCOME = 'teacher_welcome',
  PARENT_WELCOME = 'parent_welcome',

  // Authentication
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_VERIFICATION = 'email_verification',

  // Academic
  RESULTS_PUBLISHED = 'results_published',
  SCORES_ENTERED = 'scores_entered',
  SKILLS_ENTERED = 'skills_entered',

  // Financial
  FEE_REMINDER = 'fee_reminder',
  FEE_PAYMENT_RECEIVED = 'fee_payment_received',
  FEE_RECEIPT = 'fee_receipt',

  // Communication
  ANNOUNCEMENT = 'announcement',
  NEWSLETTER = 'newsletter',
  CUSTOM = 'custom',
}

// Email priority levels
export enum EmailPriority {
  HIGH = 'high',      // Password resets, urgent notifications
  NORMAL = 'normal',  // Regular notifications
  LOW = 'low',        // Newsletters, announcements
}

// Subscription plans for school welcome emails
export interface SubscriptionPlan {
  id: 'free' | 'starter' | 'professional' | 'enterprise';
  name: string;
  price: number;
  features: string[];
  limits: {
    students: number;
    teachers: number;
    classes: number;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 100 students',
      'Basic result management',
      'Parent portal access',
      'Audit trail',
      'Community support',
    ],
    limits: {
      students: 100,
      teachers: 5,
      classes: 3,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 15,
    features: [
      'Up to 300 students',
      'All Free features',
      'PDF Report Cards',
      'Email support',
      'Custom branding',
    ],
    limits: {
      students: 300,
      teachers: 15,
      classes: 10,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 35,
    features: [
      'Up to 1,000 students',
      'All Starter features',
      'Email Notifications',
      'Skills & Conduct Ratings',
      'Attendance Tracking',
      'Priority support',
    ],
    limits: {
      students: 1000,
      teachers: 50,
      classes: 30,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 75,
    features: [
      'Unlimited students',
      'All Professional features',
      'Advanced Analytics',
      'Fee Management',
      'Custom branding',
      'Dedicated support',
      'API access',
    ],
    limits: {
      students: Infinity,
      teachers: Infinity,
      classes: Infinity,
    },
  },
};
