/**
 * Password Reset Email (Phase 18)
 *
 * Sent when user requests password reset
 * Includes secure reset link with expiration
 */

import * as React from 'react';
import {
  Heading,
  Text,
  Link,
  Section,
  Hr,
} from '@react-email/components';
import { BaseEmailTemplate, emailStyles } from './BaseEmailTemplate';

export interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiryMinutes?: number;
  schoolName: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiryMinutes = 30,
  schoolName,
}: PasswordResetEmailProps) {
  return (
    <BaseEmailTemplate
      previewText="Reset your password"
      schoolName={schoolName}
    >
      <Heading style={emailStyles.heading}>
        Reset Your Password
      </Heading>

      <Text style={emailStyles.text}>
        Hi {userName},
      </Text>

      <Text style={emailStyles.text}>
        We received a request to reset your password for your {schoolName} account.
        Click the button below to create a new password:
      </Text>

      <Section style={{ margin: '32px 0' }}>
        <Link href={resetUrl} style={emailStyles.button}>
          Reset Password
        </Link>
      </Section>

      <Section style={emailStyles.card}>
        <Text style={{ ...emailStyles.text, fontSize: '14px', margin: 0 }}>
          ⏰ This link will expire in <strong>{expiryMinutes} minutes</strong> for security reasons.
        </Text>
      </Section>

      <Hr style={emailStyles.divider} />

      <Section style={{ backgroundColor: '#fef3c7', padding: '16px', borderRadius: '8px', margin: '24px 0' }}>
        <Text style={{ ...emailStyles.text, fontSize: '14px', margin: 0 }}>
          <strong>⚠️ Didn't request this?</strong>
          <br />
          If you didn't request a password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </Text>
      </Section>

      <Hr style={emailStyles.divider} />

      <Section>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px' }}>
          Security Tips
        </Heading>
        <ul style={emailStyles.list}>
          <li>Use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>Change your password regularly</li>
          <li>Don't use the same password on multiple sites</li>
        </ul>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
        If you're having trouble clicking the button, copy and paste this URL into your browser:
        <br />
        <Link href={resetUrl} style={{ color: '#2563eb', wordBreak: 'break-all' }}>
          {resetUrl}
        </Link>
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        {schoolName} Team
      </Text>
    </BaseEmailTemplate>
  );
}

export default PasswordResetEmail;
