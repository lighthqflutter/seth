/**
 * Results Published Email (Phase 18)
 *
 * Sent to parents when results are published
 * Includes student performance summary
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

export interface StudentResult {
  studentName: string;
  class: string;
  termName: string;
  averageScore: number;
  grade: string;
  position?: number;
  totalStudents?: number;
  totalSubjects: number;
  topSubjects?: Array<{ name: string; score: number }>;
  weakSubjects?: Array<{ name: string; score: number }>;
}

export interface ResultsPublishedEmailProps {
  parentName: string;
  schoolName: string;
  results: StudentResult[];
  viewUrl: string;
  downloadUrl?: string;
}

export function ResultsPublishedEmail({
  parentName,
  schoolName,
  results,
  viewUrl,
  downloadUrl,
}: ResultsPublishedEmailProps) {
  const getGradeColor = (grade: string) => {
    const gradeColors: Record<string, string> = {
      A: '#10b981',
      B: '#3b82f6',
      C: '#f59e0b',
      D: '#ef4444',
      F: '#dc2626',
    };
    return gradeColors[grade] || '#6b7280';
  };

  const getPerformanceBadge = (average: number) => {
    if (average >= 80) return { text: 'Excellent', style: emailStyles.badgeSuccess };
    if (average >= 70) return { text: 'Very Good', style: { ...emailStyles.badge, backgroundColor: '#dbeafe' } };
    if (average >= 60) return { text: 'Good', style: emailStyles.badge };
    if (average >= 50) return { text: 'Fair', style: emailStyles.badgeWarning };
    return { text: 'Needs Improvement', style: { ...emailStyles.badgeWarning, backgroundColor: '#fee2e2', color: '#991b1b' } };
  };

  return (
    <BaseEmailTemplate
      previewText="New Results Available"
      schoolName={schoolName}
    >
      <Heading style={emailStyles.heading}>
        📊 New Results Published
      </Heading>

      <Text style={emailStyles.text}>
        Dear {parentName},
      </Text>

      <Text style={emailStyles.text}>
        New academic results have been published for your {results.length === 1 ? 'child' : 'children'}.
      </Text>

      {/* Results for each student */}
      {results.map((result, index) => (
        <Section key={index} style={{ ...emailStyles.card, marginBottom: '24px' }}>
          {/* Student Header */}
          <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '8px' }}>
            {result.studentName}
          </Heading>
          <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
            {result.class} • {result.termName}
          </Text>

          {/* Performance Summary */}
          <Section style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <Row>
              <Column align="center" style={{ width: '33%' }}>
                <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                  Average
                </Text>
                <Heading as="h3" style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                  {result.averageScore.toFixed(1)}%
                </Heading>
                <span style={getPerformanceBadge(result.averageScore).style}>
                  {getPerformanceBadge(result.averageScore).text}
                </span>
              </Column>

              <Column align="center" style={{ width: '33%' }}>
                <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                  Grade
                </Text>
                <Heading as="h3" style={{ fontSize: '24px', fontWeight: 'bold', color: getGradeColor(result.grade), margin: 0 }}>
                  {result.grade}
                </Heading>
              </Column>

              {result.position && result.totalStudents && (
                <Column align="center" style={{ width: '33%' }}>
                  <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                    Position
                  </Text>
                  <Heading as="h3" style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', margin: 0 }}>
                    {result.position}/{result.totalStudents}
                  </Heading>
                </Column>
              )}
            </Row>
          </Section>

          {/* Top Subjects */}
          {result.topSubjects && result.topSubjects.length > 0 && (
            <Section style={{ marginTop: '16px' }}>
              <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>
                💪 Top Subjects
              </Text>
              <ul style={{ ...emailStyles.list, fontSize: '14px', margin: 0 }}>
                {result.topSubjects.map((subject, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {subject.name}: <strong>{subject.score}%</strong>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Weak Subjects */}
          {result.weakSubjects && result.weakSubjects.length > 0 && (
            <Section style={{ marginTop: '12px' }}>
              <Text style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>
                📚 Areas for Improvement
              </Text>
              <ul style={{ ...emailStyles.list, fontSize: '14px', margin: 0 }}>
                {result.weakSubjects.map((subject, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {subject.name}: <strong>{subject.score}%</strong>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Hr style={{ ...emailStyles.divider, margin: '16px 0' }} />

          <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Total Subjects: {result.totalSubjects}
          </Text>
        </Section>
      ))}

      {/* Action Buttons */}
      <Section style={{ margin: '32px 0' }}>
        <Row>
          <Column>
            <Link href={viewUrl} style={emailStyles.button}>
              View Full Results →
            </Link>
          </Column>
        </Row>
        {downloadUrl && (
          <Row style={{ marginTop: '12px' }}>
            <Column>
              <Link href={downloadUrl} style={emailStyles.buttonSecondary}>
                Download Report Card (PDF)
              </Link>
            </Column>
          </Row>
        )}
      </Section>

      {/* Tips Section */}
      <Hr style={emailStyles.divider} />
      <Section style={emailStyles.card}>
        <Heading as="h2" style={{ ...emailStyles.heading, fontSize: '18px', marginBottom: '12px' }}>
          💡 What to Do Next
        </Heading>
        <ul style={emailStyles.list}>
          <li>Review the detailed results on the parent portal</li>
          <li>Discuss performance with your child</li>
          <li>Celebrate achievements and encourage improvement</li>
          <li>Contact teachers if you have any concerns</li>
          <li>Download and save the report card for your records</li>
        </ul>
      </Section>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.text}>
        If you have any questions about these results, please contact the school administration.
      </Text>

      <Text style={emailStyles.text}>
        Best regards,
        <br />
        {schoolName}
      </Text>
    </BaseEmailTemplate>
  );
}

export default ResultsPublishedEmail;
