/**
 * User Welcome Emails (Phase 18)
 *
 * Onboarding emails for students, teachers, and parents
 * Includes guided tour of accessible areas
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

export interface UserWelcomeEmailProps {
  userType: 'student' | 'teacher' | 'parent';
  userName: string;
  userEmail: string;
  schoolName: string;
  loginUrl: string;
  temporaryPassword?: string;
  linkedChildren?: Array<{ name: string; class: string }>;
  assignedClasses?: Array<{ name: string; level: string }>;
}

export function UserWelcomeEmail({
  userType,
  userName,
  userEmail,
  schoolName,
  loginUrl,
  temporaryPassword,
  linkedChildren,
  assignedClasses,
}: UserWelcomeEmailProps) {
  const roleConfig = {
    student: {
      title: 'Welcome to Your Student Portal!',
      emoji: '🎓',
      intro: `You now have access to ${schoolName}'s student portal where you can view your academic progress and results.`,
      features: [
        {
          title: 'View Your Results',
          description: 'Access your test scores, exam results, and report cards',
        },
        {
          title: 'Check Your Performance',
          description: 'See your grades, class position, and subject averages',
        },
        {
          title: 'Skills & Conduct',
          description: 'Review your behavioral and psychomotor ratings',
        },
        {
          title: 'Download Report Cards',
          description: 'Get PDF copies of your academic reports',
        },
      ],
    },
    teacher: {
      title: 'Welcome to the Teacher Portal!',
      emoji: '👨‍🏫',
      intro: `You've been added to ${schoolName} as a teacher. Your account is now active!`,
      features: [
        {
          title: 'Score Entry',
          description: 'Enter and manage student scores for your assigned classes',
        },
        {
          title: 'Skills Assessment',
          description: 'Rate students on behavioral, social, and psychomotor skills',
        },
        {
          title: 'Class Management',
          description: 'View your class rosters and student information',
        },
        {
          title: 'Result Publication',
          description: 'Publish results to make them visible to students and parents',
        },
        {
          title: 'Reports & Analytics',
          description: 'Generate class reports and view performance analytics',
        },
      ],
    },
    parent: {
      title: 'Welcome to the Parent Portal!',
      emoji: '👨‍👩‍👧‍👦',
      intro: `You now have access to ${schoolName}'s parent portal to monitor your child's academic progress.`,
      features: [
        {
          title: 'View Children\'s Results',
          description: 'Access all published results and report cards for your children',
        },
        {
          title: 'Track Academic Performance',
          description: 'Monitor grades, class positions, and subject performance',
        },
        {
          title: 'Download Report Cards',
          description: 'Get PDF copies of your children\'s report cards',
        },
        {
          title: 'View Skills Ratings',
          description: 'See behavioral and conduct assessments',
        },
        {
          title: 'Family Dashboard',
          description: 'View all your children\'s progress in one place',
        },
      ],
    },
  };

  const config = roleConfig[userType];

  return (
    <BaseEmailTemplate
      previewText={`${config.title} - ${schoolName}`}
      schoolName={schoolName}
    >
      <Heading style={emailStyles.heading}>
        {config.emoji} {config.title}
      </Heading>

      <Text style={emailStyles.text}>
        Hi {userName},
      </Text>

      <Text style={emailStyles.text}>
        {config.intro}
      </Text>

      {/* Login Credentials */}
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          Your Login Details
        </Heading>
        <Text style={{ ...emailStyles.text, fontSize: '14px', margin: '8px 0' }}>
          <strong>Email:</strong> {userEmail}
        </Text>
        {temporaryPassword && (
          <Text style={{ ...emailStyles.text, fontSize: '14px', margin: '8px 0' }}>
            <strong>Temporary Password:</strong> {temporaryPassword}
          </Text>
        )}
        <Text style={{ ...emailStyles.text, fontSize: '14px', margin: '8px 0', color: '#ef4444' }}>
          ⚠️ Please change your password after your first login
        </Text>
      </Section>

      <Section style={{ margin: '32px 0' }}>
        <Link href={loginUrl} style={emailStyles.button}>
          Login to Your Account →
        </Link>
      </Section>

      {/* Linked Children (Parents only) */}
      {userType === 'parent' && linkedChildren && linkedChildren.length > 0 && (
        <Section style={{ ...emailStyles.card, marginTop: '24px' }}>
          <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
            Your Linked Children
          </Heading>
          <ul style={{ ...emailStyles.list, margin: 0 }}>
            {linkedChildren.map((child, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                <strong>{child.name}</strong> - {child.class}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Assigned Classes (Teachers only) */}
      {userType === 'teacher' && assignedClasses && assignedClasses.length > 0 && (
        <Section style={{ ...emailStyles.card, marginTop: '24px' }}>
          <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
            Your Assigned Classes
          </Heading>
          <ul style={{ ...emailStyles.list, margin: 0 }}>
            {assignedClasses.map((cls, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                <strong>{cls.name}</strong> - {cls.level}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* What You Can Do */}
      <Hr style={emailStyles.divider} />
      <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '20px', marginTop: '32px' }}>
        What You Can Do
      </Heading>

      {config.features.map((feature, index) => (
        <Section key={index} style={{ margin: '16px 0' }}>
          <Row>
            <Column>
              <Text style={{ ...emailStyles.text, marginBottom: '4px', fontWeight: '600' }}>
                {index + 1}. {feature.title}
              </Text>
              <Text style={{ ...emailStyles.text, fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
                {feature.description}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}

      {/* Quick Tips */}
      <Hr style={emailStyles.divider} />
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          💡 Quick Tips
        </Heading>
        <ul style={emailStyles.list}>
          {userType === 'teacher' && (
            <>
              <li>You can enter scores for multiple students at once using the score entry table</li>
              <li>Remember to publish results to make them visible to students and parents</li>
              <li>Use the skills entry page to rate students on behavioral and psychomotor skills</li>
            </>
          )}
          {userType === 'parent' && (
            <>
              <li>Results are only visible after teachers publish them</li>
              <li>You can download PDF report cards for all your children at once</li>
              <li>Check your family dashboard for a combined view of all your children</li>
            </>
          )}
          {userType === 'student' && (
            <>
              <li>New results will appear on your dashboard as teachers publish them</li>
              <li>You can download your report card as a PDF</li>
              <li>Check your skills ratings to see behavioral and conduct assessments</li>
            </>
          )}
          <li>Update your profile information to keep your details current</li>
          <li>Change your password regularly for security</li>
        </ul>
      </Section>

      {/* Need Help */}
      <Hr style={emailStyles.divider} />
      <Section style={{ marginTop: '32px' }}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px' }}>
          Need Help?
        </Heading>
        <Text style={emailStyles.text}>
          If you have any questions or need assistance:
        </Text>
        <ul style={emailStyles.list}>
          <li>
            📚 Check our{' '}
            <Link href="https://cedarsportal.com.ng/docs" style={{ color: '#2563eb' }}>
              User Guide
            </Link>
          </li>
          <li>
            💬 Contact school administration
          </li>
          <li>
            📧 Email support at{' '}
            <Link href="mailto:support@cedarsportal.com.ng" style={{ color: '#2563eb' }}>
              support@cedarsportal.com.ng
            </Link>
          </li>
        </ul>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.text}>
        We're excited to have you on board!
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        {schoolName}
      </Text>
    </BaseEmailTemplate>
  );
}

export default UserWelcomeEmail;
