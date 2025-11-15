/**
 * Fee Payment Reminder Email (Phase 18)
 *
 * Sent to parents for outstanding fee payments
 * Includes payment details and methods
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

export interface FeeItem {
  description: string;
  amount: number;
  dueDate?: Date;
}

export interface FeeReminderEmailProps {
  parentName: string;
  schoolName: string;
  studentName: string;
  studentClass: string;
  termName: string;
  fees: FeeItem[];
  totalAmount: number;
  currency?: string;
  dueDate?: Date;
  paymentUrl?: string;
  accountDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  latePenalty?: number;
}

export function FeeReminderEmail({
  parentName,
  schoolName,
  studentName,
  studentClass,
  termName,
  fees,
  totalAmount,
  currency = '₦',
  dueDate,
  paymentUrl,
  accountDetails,
  latePenalty,
}: FeeReminderEmailProps) {
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDue = dueDate && new Date() > dueDate;
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <BaseEmailTemplate
      previewText="Fee Payment Reminder"
      schoolName={schoolName}
    >
      <Heading style={emailStyles.heading}>
        💰 Fee Payment Reminder
      </Heading>

      <Text style={emailStyles.text}>
        Dear {parentName},
      </Text>

      <Text style={emailStyles.text}>
        This is a {isDue ? 'reminder' : 'friendly reminder'} regarding outstanding school fees for <strong>{studentName}</strong> ({studentClass}).
      </Text>

      {/* Due Date Warning */}
      {dueDate && (
        <Section style={{
          backgroundColor: isDue ? '#fee2e2' : '#fef3c7',
          padding: '16px',
          borderRadius: '8px',
          margin: '24px 0',
        }}>
          <Text style={{ ...emailStyles.text, fontSize: '14px', margin: 0 }}>
            {isDue ? (
              <>
                <strong>⚠️ Payment Overdue</strong>
                <br />
                The payment was due on {formatDate(dueDate)}.
                {latePenalty && ` A late payment penalty of ${formatCurrency(latePenalty)} may apply.`}
              </>
            ) : (
              <>
                <strong>📅 Due Date: {formatDate(dueDate)}</strong>
                <br />
                {daysUntilDue && daysUntilDue > 0 && (
                  `Payment is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`
                )}
              </>
            )}
          </Text>
        </Section>
      )}

      {/* Fee Breakdown */}
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          Fee Breakdown - {termName}
        </Heading>

        {fees.map((fee, index) => (
          <Row key={index} style={{ marginBottom: '12px' }}>
            <Column style={{ width: '70%' }}>
              <Text style={{ fontSize: '14px', margin: 0 }}>{fee.description}</Text>
              {fee.dueDate && (
                <Text style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                  Due: {formatDate(fee.dueDate)}
                </Text>
              )}
            </Column>
            <Column style={{ width: '30%', textAlign: 'right' }}>
              <Text style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                {formatCurrency(fee.amount)}
              </Text>
            </Column>
          </Row>
        ))}

        <Hr style={{ ...emailStyles.divider, margin: '16px 0' }} />

        <Row>
          <Column style={{ width: '70%' }}>
            <Text style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
              Total Amount Due
            </Text>
          </Column>
          <Column style={{ width: '30%', textAlign: 'right' }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              {formatCurrency(totalAmount)}
            </Text>
          </Column>
        </Row>

        {latePenalty && latePenalty > 0 && (
          <Row style={{ marginTop: '12px' }}>
            <Column style={{ width: '70%' }}>
              <Text style={{ fontSize: '14px', color: '#ef4444', margin: 0 }}>
                Late Payment Penalty
              </Text>
            </Column>
            <Column style={{ width: '30%', textAlign: 'right' }}>
              <Text style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444', margin: 0 }}>
                {formatCurrency(latePenalty)}
              </Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* Payment Methods */}
      <Hr style={emailStyles.divider} />
      <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '20px', marginTop: '32px' }}>
        Payment Methods
      </Heading>

      {paymentUrl && (
        <Section style={{ margin: '16px 0' }}>
          <Heading as="h3" style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
            💳 Pay Online
          </Heading>
          <Text style={{ ...emailStyles.text, fontSize: '14px' }}>
            Make a secure online payment using your debit/credit card
          </Text>
          <Link href={paymentUrl} style={{ ...emailStyles.button, marginTop: '12px' }}>
            Pay Now →
          </Link>
        </Section>
      )}

      {accountDetails && (
        <Section style={{ ...emailStyles.card, marginTop: '24px' }}>
          <Heading as="h3" style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px' }}>
            🏦 Bank Transfer
          </Heading>
          <Text style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Bank Name:</strong> {accountDetails.bankName}
          </Text>
          <Text style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Account Name:</strong> {accountDetails.accountName}
          </Text>
          <Text style={{ fontSize: '14px', margin: '4px 0' }}>
            <strong>Account Number:</strong> {accountDetails.accountNumber}
          </Text>
          <Hr style={{ ...emailStyles.divider, margin: '12px 0' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            ⚠️ Please include <strong>{studentName} - {termName}</strong> as the payment reference
          </Text>
        </Section>
      )}

      <Section style={{ margin: '24px 0' }}>
        <Heading as="h3" style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
          🏫 Pay at School
          </Heading>
        <Text style={{ ...emailStyles.text, fontSize: '14px' }}>
          Visit the school's bursar office during working hours
        </Text>
      </Section>

      {/* Important Notes */}
      <Hr style={emailStyles.divider} />
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          📌 Important Notes
        </Heading>
        <ul style={emailStyles.list}>
          <li>Keep your payment receipt for your records</li>
          <li>Allow 24-48 hours for payment confirmation</li>
          <li>Contact the bursar if you've already paid</li>
          {latePenalty && (
            <li>Late payments may attract a penalty of {formatCurrency(latePenalty)}</li>
          )}
        </ul>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.text}>
        If you have any questions or need to discuss payment arrangements, please contact the school's bursar office.
      </Text>

      <Text style={emailStyles.text}>
        Thank you for your prompt attention to this matter.
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        {schoolName}
        <br />
        Bursar's Office
      </Text>
    </BaseEmailTemplate>
  );
}

export default FeeReminderEmail;
