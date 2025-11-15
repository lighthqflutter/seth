/**
 * School Welcome Email (Phase 18)
 *
 * Sent when a new school signs up
 * Shows plan-based features and upgrade options
 */

import * as React from 'react';
import {
  Heading,
  Text,
  Link,
  Section,
  Row,
  Column,
  Hr,
} from '@react-email/components';
import { BaseEmailTemplate, emailStyles } from './BaseEmailTemplate';
import { SubscriptionPlan, SUBSCRIPTION_PLANS } from '../config';

export interface SchoolWelcomeEmailProps {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  loginUrl: string;
  setupGuideUrl?: string;
}

export function SchoolWelcomeEmail({
  schoolName,
  adminName,
  adminEmail,
  plan,
  loginUrl,
  setupGuideUrl = 'https://cedarsportal.com.ng/docs/setup',
}: SchoolWelcomeEmailProps) {
  const currentPlan = SUBSCRIPTION_PLANS[plan];
  const upgradePlans = Object.values(SUBSCRIPTION_PLANS).filter(
    p => p.price > currentPlan.price
  );

  return (
    <BaseEmailTemplate
      previewText={`Welcome to Cedars School Portal - ${currentPlan.name} Plan`}
      schoolName="Cedars School Portal"
    >
      <Heading style={emailStyles.heading}>
        Welcome to Cedars School Portal! 🎉
      </Heading>

      <Text style={emailStyles.text}>
        Hi {adminName},
      </Text>

      <Text style={emailStyles.text}>
        Congratulations! <strong>{schoolName}</strong> is now set up on Cedars School Portal.
        You're currently on the <span style={emailStyles.badgeSuccess}>{currentPlan.name} Plan</span>.
      </Text>

      {/* Login Button */}
      <Section style={{ margin: '32px 0' }}>
        <Link href={loginUrl} style={emailStyles.button}>
          Get Started →
        </Link>
      </Section>

      {/* Current Plan Features */}
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          Your {currentPlan.name} Plan Includes:
        </Heading>
        <ul style={emailStyles.list}>
          {currentPlan.features.map((feature, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>
              ✓ {feature}
            </li>
          ))}
        </ul>
        <Hr style={emailStyles.divider} />
        <Text style={{ ...emailStyles.text, fontSize: '14px', margin: 0 }}>
          <strong>Limits:</strong> {currentPlan.limits.students} students · {currentPlan.limits.teachers} teachers · {currentPlan.limits.classes} classes
        </Text>
      </Section>

      {/* Quick Start Guide */}
      <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '20px', marginTop: '32px' }}>
        Quick Start Guide
      </Heading>

      <Section style={{ margin: '16px 0' }}>
        <Row>
          <Column>
            <Text style={{ ...emailStyles.text, marginBottom: '8px' }}>
              <strong>1. Set up your school profile</strong>
            </Text>
            <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
              Add your school logo, address, and branding
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={{ ...emailStyles.text, marginBottom: '8px' }}>
              <strong>2. Add teachers</strong>
            </Text>
            <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
              Invite your teaching staff to the platform
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={{ ...emailStyles.text, marginBottom: '8px' }}>
              <strong>3. Create classes and students</strong>
            </Text>
            <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
              Set up your class structure and student records
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={{ ...emailStyles.text, marginBottom: '8px' }}>
              <strong>4. Add parents/guardians</strong>
            </Text>
            <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
              Link parents to their children for portal access
            </Text>
          </Column>
        </Row>
      </Section>

      {setupGuideUrl && (
        <Section style={{ margin: '24px 0' }}>
          <Link href={setupGuideUrl} style={emailStyles.buttonSecondary}>
            View Full Setup Guide
          </Link>
        </Section>
      )}

      {/* Upgrade Options */}
      {upgradePlans.length > 0 && (
        <>
          <Hr style={emailStyles.divider} />
          <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '20px', marginTop: '32px' }}>
            Unlock More Features
          </Heading>

          <Text style={emailStyles.text}>
            As your school grows, you can upgrade to unlock additional features:
          </Text>

          {upgradePlans.map((upgradePlan) => (
            <Section key={upgradePlan.id} style={{ ...emailStyles.card, marginBottom: '16px' }}>
              <Row>
                <Column>
                  <Heading as="h3" style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px' }}>
                    {upgradePlan.name} Plan
                    <span style={{ ...emailStyles.badge, marginLeft: '8px' }}>
                      ${upgradePlan.price}/month
                    </span>
                  </Heading>
                  <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px' }}>
                    Up to {upgradePlan.limits.students === Infinity ? 'unlimited' : upgradePlan.limits.students} students
                  </Text>
                  <ul style={{ ...emailStyles.list, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                    {upgradePlan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} style={{ marginBottom: '4px' }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Column>
              </Row>
            </Section>
          ))}

          <Section style={{ margin: '24px 0' }}>
            <Link
              href={`${loginUrl}?redirect=/settings/billing`}
              style={emailStyles.buttonSecondary}
            >
              View All Plans
            </Link>
          </Section>
        </>
      )}

      {/* Support Section */}
      <Hr style={emailStyles.divider} />
      <Section style={{ marginTop: '32px' }}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px' }}>
          Need Help?
        </Heading>
        <Text style={emailStyles.text}>
          We're here to support you:
        </Text>
        <ul style={emailStyles.list}>
          <li>
            📚 <Link href="https://cedarsportal.com.ng/docs" style={{ color: '#2563eb' }}>
              Documentation
            </Link>
          </li>
          <li>
            💬 <Link href="https://cedarsportal.com.ng/support" style={{ color: '#2563eb' }}>
              Support Center
            </Link>
          </li>
          <li>
            📧 Email us at{' '}
            <Link href="mailto:support@cedarsportal.com.ng" style={{ color: '#2563eb' }}>
              support@cedarsportal.com.ng
            </Link>
          </li>
        </ul>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280' }}>
        Your Login Details:
        <br />
        Email: {adminEmail}
        <br />
        URL: <Link href={loginUrl} style={{ color: '#2563eb' }}>{loginUrl}</Link>
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        The Cedars School Portal Team
      </Text>
    </BaseEmailTemplate>
  );
}

export default SchoolWelcomeEmail;
