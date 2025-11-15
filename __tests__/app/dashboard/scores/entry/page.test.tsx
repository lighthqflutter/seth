/**
 * Tests for Class-Wide Score Entry Page
 * Phase 11: Dynamic score entry with flexible CAs
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import ScoreEntryPage from '@/app/dashboard/scores/entry/page';

jest.mock('firebase/firestore');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'teacher-1', role: 'teacher', tenantId: 'tenant-123' },
    loading: false,
  })),
}));

describe('Score Entry Page', () => {
  const mockPush = jest.fn();
  const mockGetDocs = getDocs as jest.Mock;
  const mockAddDoc = addDoc as jest.Mock;
  const mockUpdateDoc = updateDoc as jest.Mock;

  // Mock assessment config (3 CAs + Exam)
  const mockTenantSettings = {
    assessment: {
      numberOfCAs: 3,
      caConfigs: [
        { name: 'CA1', maxScore: 10, isOptional: false },
        { name: 'CA2', maxScore: 10, isOptional: false },
        { name: 'CA3', maxScore: 10, isOptional: false },
      ],
      exam: { enabled: true, name: 'Exam', maxScore: 70 },
      project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
      calculationMethod: 'sum',
      totalMaxScore: 100,
    },
    grading: {
      system: 'letter',
      gradeBoundaries: [
        { grade: 'A1', minScore: 75, maxScore: 100 },
        { grade: 'B2', minScore: 70, maxScore: 74 },
        { grade: 'F9', minScore: 0, maxScore: 39 },
      ],
      passMark: 40,
    },
  };

  const mockStudents = [
    {
      id: 'student-1',
      firstName: 'John',
      lastName: 'Doe',
      admissionNumber: 'ADM001',
    },
    {
      id: 'student-2',
      firstName: 'Jane',
      lastName: 'Smith',
      admissionNumber: 'ADM002',
    },
  ];

  const mockClasses = [
    { id: 'class-1', name: 'JSS 1A', level: 'JSS1' },
  ];

  const mockSubjects = [
    { id: 'subject-1', name: 'Mathematics', code: 'MATH', maxScore: 100 },
  ];

  const mockTerms = [
    { id: 'term-1', name: 'First Term 2024/2025', isCurrent: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    // Mock useSearchParams
    require('next/navigation').useSearchParams.mockReturnValue({
      get: (key: string) => {
        if (key === 'classId') return 'class-1';
        if (key === 'subjectId') return 'subject-1';
        if (key === 'termId') return 'term-1';
        return null;
      },
    });
  });

  it('should render page title', async () => {
    mockGetDocs.mockResolvedValue({
      docs: mockStudents.map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText(/score entry/i)).toBeInTheDocument();
    });
  });

  it('should load and display students', async () => {
    mockGetDocs.mockResolvedValue({
      docs: mockStudents.map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display dynamic CA input fields based on config', async () => {
    mockGetDocs.mockResolvedValue({
      docs: mockStudents.map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      // Should have CA1, CA2, CA3, Exam columns
      expect(screen.getByText(/CA1/i)).toBeInTheDocument();
      expect(screen.getByText(/CA2/i)).toBeInTheDocument();
      expect(screen.getByText(/CA3/i)).toBeInTheDocument();
      expect(screen.getByText(/exam/i)).toBeInTheDocument();
    });
  });

  it('should calculate total and grade automatically', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [mockStudents[0]].map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Enter scores
    const ca1Input = screen.getByLabelText(/ca1.*john doe/i);
    const ca2Input = screen.getByLabelText(/ca2.*john doe/i);
    const ca3Input = screen.getByLabelText(/ca3.*john doe/i);
    const examInput = screen.getByLabelText(/exam.*john doe/i);

    fireEvent.change(ca1Input, { target: { value: '8' } });
    fireEvent.change(ca2Input, { target: { value: '9' } });
    fireEvent.change(ca3Input, { target: { value: '10' } });
    fireEvent.change(examInput, { target: { value: '65' } });

    // Should show calculated total and grade
    await waitFor(() => {
      expect(screen.getByText('92.0')).toBeInTheDocument(); // Total
      // Check for grade badge specifically (not column header)
      const gradeBadges = screen.getAllByText('A1');
      expect(gradeBadges.length).toBeGreaterThan(0);
    });
  });

  it('should validate scores against max values', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [mockStudents[0]].map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Enter score exceeding max
    const ca1Input = screen.getByLabelText(/ca1.*john doe/i);
    fireEvent.change(ca1Input, { target: { value: '15' } }); // Max is 10

    await waitFor(() => {
      expect(screen.getByText(/exceeds maximum/i)).toBeInTheDocument();
    });
  });

  it('should save scores as draft', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [mockStudents[0]].map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    mockAddDoc.mockResolvedValue({ id: 'score-1' });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Enter valid scores
    fireEvent.change(screen.getByLabelText(/ca1.*john doe/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/ca2.*john doe/i), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(/ca3.*john doe/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/exam.*john doe/i), { target: { value: '65' } });

    // Click Save as Draft
    const saveButton = screen.getByRole('button', { name: /save as draft/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });

    // Verify draft flag
    const callData = mockAddDoc.mock.calls[0][1];
    expect(callData.isDraft).toBe(true);
    expect(callData.isPublished).toBe(false);
  });

  it('should publish scores', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [mockStudents[0]].map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    mockAddDoc.mockResolvedValue({ id: 'score-1' });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Enter valid scores
    fireEvent.change(screen.getByLabelText(/ca1.*john doe/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/ca2.*john doe/i), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(/ca3.*john doe/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/exam.*john doe/i), { target: { value: '65' } });

    // Click Publish
    const publishButton = screen.getByRole('button', { name: /publish scores/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });

    // Verify published flag
    const callData = mockAddDoc.mock.calls[0][1];
    expect(callData.isDraft).toBe(false);
    expect(callData.isPublished).toBe(true);
    expect(callData.publishedAt).toBeDefined();
  });

  it('should show loading state', () => {
    mockGetDocs.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ScoreEntryPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle empty student list', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no students found/i)).toBeInTheDocument();
    });
  });

  it('should mark absent students', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [mockStudents[0]].map(s => ({
        id: s.id,
        data: () => s,
      })),
    });

    render(<ScoreEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click absent checkbox
    const absentCheckbox = screen.getByLabelText(/mark.*john doe.*absent/i);
    fireEvent.click(absentCheckbox);

    // Inputs should be disabled
    const ca1Input = screen.getByLabelText(/ca1.*john doe/i);
    expect(ca1Input).toBeDisabled();
  });
});
