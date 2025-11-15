/**
 * Base Email Template (Phase 18)
 *
 * Reusable email layout with school branding
 * All email templates extend this base
 */

import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Hr,
  Img,
} from '@react-email/components';

export interface BaseEmailTemplateProps {
  children: React.ReactNode;
  previewText?: string;
  schoolName?: string;
  schoolLogo?: string;
}

export function BaseEmailTemplate({
  children,
  previewText,
  schoolName = 'Cedars School Portal',
  schoolLogo,
}: BaseEmailTemplateProps) {
  return (
    <Html>
      <Head>
        {previewText && (
          <meta name="description" content={previewText} />
        )}
      </Head>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column align="center">
                {schoolLogo ? (
                  <Img
                    src={schoolLogo}
                    alt={schoolName}
                    width="120"
                    height="60"
                    style={logo}
                  />
                ) : (
                  <Heading style={headerTitle}>{schoolName}</Heading>
                )}
              </Column>
            </Row>
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {schoolName}. All rights reserved.
            </Text>
            <Text style={footerText}>
              Powered by{' '}
              <Link href="https://cedarsportal.com.ng" style={footerLink}>
                Cedars School Portal
              </Link>
            </Text>
            <Text style={footerText}>
              <Link href="{{{unsubscribe}}}" style={footerLink}>
                Unsubscribe
              </Link>
              {' · '}
              <Link href="https://cedarsportal.com.ng/privacy" style={footerLink}>
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px',
  backgroundColor: '#1e3a8a',
  borderRadius: '8px 8px 0 0',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  padding: '24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 24px 24px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#556cd6',
  textDecoration: 'none',
};

// Common email styles exported for use in other templates
export const emailStyles = {
  heading: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 16px',
  },
  text: {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '20px',
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    color: '#1f2937',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '20px',
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    margin: '16px 0',
  },
  badge: {
    backgroundColor: '#dbeafe',
    borderRadius: '12px',
    color: '#1e40af',
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    margin: '0 4px',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    borderRadius: '12px',
    color: '#065f46',
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    margin: '0 4px',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    color: '#92400e',
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    margin: '0 4px',
  },
  list: {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
    paddingLeft: '20px',
  },
  divider: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
};
