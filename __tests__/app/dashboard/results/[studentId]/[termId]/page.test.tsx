import { render, screen, waitFor } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { getDoc, getDocs } from 'firebase/firestore';
import StudentResultPage from '@/app/dashboard/results/[studentId]/[termId]/page';

jest.mock('firebase/firestore');
jest.mock('next/navigation');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      uid: 'test-user',
      name: 'Test User',
      email: 'test@test.com',
      role: 'admin',
      tenantId: 'tenant-123',
    },
    loading: false,
  })),
}));

describe.skip('Student Result Detail Page', () => {
  const mockPush = jest.fn();
  const mockGetDoc = getDoc as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;

  const mockStudent = {
    id: 'student-1',
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'ADM001',
    currentClassId: 'class-1',
  };

  const mockClass = {
    id: 'class-1',
    name: 'JSS 1A',
    level: 'JSS1',
  };

  const mockTerm = {
    id: 'term-1',
    name: 'First Term 2024/2025',
    academicYear: '2024/2025',
  };

  const mockScores = [
    {
      id: 'score-1',
      subjectId: 'sub-1',
      studentId: 'student-1',
      assessmentScores: { ca1: 8, ca2: 9, ca3: 7, exam: 65 },
      total: 89,
      percentage: 89,
      grade: 'A1',
      isAbsent: false,
      isExempted: false,
      isPublished: true,
    },
    {
      id: 'score-2',
      subjectId: 'sub-2',
      studentId: 'student-1',
      assessmentScores: { ca1: 7, ca2: 8, ca3: 8, exam: 58 },
      total: 81,
      percentage: 81,
      grade: 'A1',
      isAbsent: false,
      isExempted: false,
      isPublished: true,
    },
  ];

  const mockSubjects = {
    'sub-1': { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
    'sub-2': { id: 'sub-2', name: 'English', code: 'ENG' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useParams as jest.Mock).mockReturnValue({
      studentId: 'student-1',
      termId: 'term-1',
    });

    // Mock getDoc for different documents
    mockGetDoc.mockImplementation((docRef: any) => {
      const path = docRef.path || docRef._key?.path?.segments?.join('/') || '';

      if (path.includes('students/student-1')) {
        return Promise.resolve({
          exists: () => true,
          id: 'student-1',
          data: () => mockStudent,
        });
      }
      if (path.includes('classes/class-1')) {
        return Promise.resolve({
          exists: () => true,
          id: 'class-1',
          data: () => mockClass,
        });
      }
      if (path.includes('terms/term-1')) {
        return Promise.resolve({
          exists: () => true,
          id: 'term-1',
          data: () => mockTerm,
        });
      }
      if (path.includes('subjects/sub-1')) {
        return Promise.resolve({
          exists: () => true,
          id: 'sub-1',
          data: () => mockSubjects['sub-1'],
        });
      }
      if (path.includes('subjects/sub-2')) {
        return Promise.resolve({
          exists: () => true,
          id: 'sub-2',
          data: () => mockSubjects['sub-2'],
        });
      }

      return Promise.resolve({
        exists: () => false,
      });
    });

    // Mock getDocs for scores query
    mockGetDocs.mockResolvedValue({
      docs: mockScores.map((score) => ({
        id: score.id,
        data: () => score,
      })),
    });
  });

  it('should render page title with student name', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display student info (admission number, class, term)', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText(/ADM001/)).toBeInTheDocument();
      expect(screen.getByText(/JSS 1A/)).toBeInTheDocument();
      expect(screen.getByText(/First Term 2024\/2025/)).toBeInTheDocument();
    });
  });

  it('should display summary statistics', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Score')).toBeInTheDocument();
      expect(screen.getByText('Average')).toBeInTheDocument();
      expect(screen.getByText('Subjects')).toBeInTheDocument();
      expect(screen.getByText('Position')).toBeInTheDocument();
    });
  });

  it('should calculate and display correct average', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      // Average of 89 and 81 is 85
      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });
  });

  it('should display performance remark', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('Performance Remark')).toBeInTheDocument();
      expect(screen.getByText('Excellent performance')).toBeInTheDocument();
    });
  });

  it('should display all subject scores in table', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('MATH')).toBeInTheDocument();
      expect(screen.getByText('ENG')).toBeInTheDocument();
    });
  });

  it('should display individual assessment scores', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      // Check that CA scores and exam scores are displayed
      expect(screen.getByText('8')).toBeInTheDocument(); // CA1 for Math
      expect(screen.getByText('9')).toBeInTheDocument(); // CA2 for Math
      expect(screen.getByText('65')).toBeInTheDocument(); // Exam for Math
    });
  });

  it('should display total score and grade for each subject', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('89.0')).toBeInTheDocument();
      expect(screen.getByText('81.0')).toBeInTheDocument();
      // Multiple A1 grades
      expect(screen.getAllByText('A1').length).toBeGreaterThan(0);
    });
  });

  it('should show pass/fail remark for each subject', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Pass').length).toBeGreaterThan(0);
    });
  });

  it('should handle no scores available', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('No scores available for this term')).toBeInTheDocument();
    });
  });

  it('should handle absent student for a subject', async () => {
    const scoresWithAbsent = [
      {
        ...mockScores[0],
        isAbsent: true,
      },
      mockScores[1],
    ];

    mockGetDocs.mockResolvedValue({
      docs: scoresWithAbsent.map((score) => ({
        id: score.id,
        data: () => score,
      })),
    });

    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getAllByText('ABS').length).toBeGreaterThan(0);
      expect(screen.getByText('Absent')).toBeInTheDocument();
    });
  });

  it('should have back button', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back to results/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  it('should have download PDF button', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      expect(downloadButton).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    mockGetDoc.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<StudentResultPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle student not found error', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('Student not found')).toBeInTheDocument();
    });
  });

  it('should calculate passed and failed subjects correctly', async () => {
    const scoresWithFailure = [
      mockScores[0], // 89% - pass
      {
        ...mockScores[1],
        percentage: 35, // below pass mark of 40
        grade: 'F9',
      },
    ];

    mockGetDocs.mockResolvedValue({
      docs: scoresWithFailure.map((score) => ({
        id: score.id,
        data: () => score,
      })),
    });

    render(<StudentResultPage />);

    await waitFor(() => {
      expect(screen.getByText('1 passed')).toBeInTheDocument();
      expect(screen.getByText('1 failed')).toBeInTheDocument();
    });
  });

  it('should display grade with appropriate color coding', async () => {
    render(<StudentResultPage />);

    await waitFor(() => {
      const gradeBadges = screen.getAllByText('A1');
      expect(gradeBadges[0]).toHaveClass('text-green-800');
    });
  });
});
