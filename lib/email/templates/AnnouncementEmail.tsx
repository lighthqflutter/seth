/**
 * Newsletter/Announcement Email (Phase 18)
 *
 * General announcements and newsletters for school community
 * Flexible template for various communication needs
 */

import * as React from 'react';
import {
  Heading,
  Text,
  Link,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { BaseEmailTemplate, emailStyles } from './BaseEmailTemplate';

export interface AnnouncementSection {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
}

export interface AnnouncementEmailProps {
  schoolName: string;
  title: string;
  greeting?: string;
  introduction: string;
  sections: AnnouncementSection[];
  callToAction?: {
    text: string;
    url: string;
  };
  footer?: string;
  priority?: 'high' | 'normal' | 'low';
}

export function AnnouncementEmail({
  schoolName,
  title,
  greeting,
  introduction,
  sections,
  callToAction,
  footer,
  priority = 'normal',
}: AnnouncementEmailProps) {
  const priorityEmoji = {
    high: '🔴',
    normal: '📢',
    low: 'ℹ️',
  };

  const priorityBadge = {
    high: { ...emailStyles.badgeWarning, backgroundColor: '#fee2e2', color: '#991b1b' },
    normal: emailStyles.badge,
    low: { ...emailStyles.badge, backgroundColor: '#e5e7eb', color: '#4b5563' },
  };

  const priorityText = {
    high: 'Important',
    normal: 'Announcement',
    low: 'Information',
  };

  return (
    <BaseEmailTemplate
      previewText={title}
      schoolName={schoolName}
    >
      {/* Priority Badge */}
      <Section style={{ marginBottom: '16px' }}>
        <span style={priorityBadge[priority]}>
          {priorityEmoji[priority]} {priorityText[priority]}
        </span>
      </Section>

      <Heading style={emailStyles.heading}>
        {title}
      </Heading>

      {greeting && (
        <Text style={emailStyles.text}>
          {greeting}
        </Text>
      )}

      <Text style={emailStyles.text}>
        {introduction}
      </Text>

      {/* Announcement Sections */}
      {sections.map((section, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Hr style={emailStyles.divider} />}

          <Section style={{ marginTop: index > 0 ? '32px' : '24px' }}>
            {section.imageUrl && (
              <Img
                src={section.imageUrl}
                alt={section.title}
                style={{
                  width: '100%',
                  maxWidth: '552px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              />
            )}

            <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '20px', marginBottom: '12px' }}>
              {section.title}
            </Heading>

            <Text style={emailStyles.text}>
              {section.content}
            </Text>

            {section.linkUrl && section.linkText && (
              <Section style={{ marginTop: '16px' }}>
                <Link href={section.linkUrl} style={emailStyles.buttonSecondary}>
                  {section.linkText} →
                </Link>
              </Section>
            )}
          </Section>
        </React.Fragment>
      ))}

      {/* Call to Action */}
      {callToAction && (
        <>
          <Hr style={emailStyles.divider} />
          <Section style={{ margin: '32px 0', textAlign: 'center' }}>
            <Link href={callToAction.url} style={emailStyles.button}>
              {callToAction.text}
            </Link>
          </Section>
        </>
      )}

      {/* Footer Message */}
      {footer && (
        <>
          <Hr style={emailStyles.divider} />
          <Section style={emailStyles.card}>
            <Text style={{ ...emailStyles.text, fontSize: '14px', margin: 0 }}>
              {footer}
            </Text>
          </Section>
        </>
      )}

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.text}>
        Thank you,
        <br />
        {schoolName}
      </Text>

      <Text style={{ ...emailStyles.text, fontSize: '12px', color: '#6b7280' }}>
        You're receiving this email because you are part of the {schoolName} community.
      </Text>
    </BaseEmailTemplate>
  );
}

export default AnnouncementEmail;
