import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import SubjectsPage from '@/app/dashboard/subjects/page'

// Mock Firebase and auth
jest.mock('firebase/firestore')
jest.mock('next/navigation')
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      uid: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      tenantId: 'tenant-123',
    },
    loading: false,
  })),
}))

describe('Subjects List Page', () => {
  const mockPush = jest.fn()
  const mockOnSnapshot = onSnapshot as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render page title', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^subjects$/i })).toBeInTheDocument()
  })

  it('should display empty state when no subjects exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no subjects yet/i)).toBeInTheDocument()
    })
  })

  it('should show "Add Subject" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    expect(screen.getByRole('button', { name: /add subject/i })).toBeInTheDocument()
  })

  it('should show "Import CSV" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
  })

  it('should navigate to add subject page when clicking "Add Subject"', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    const addButton = screen.getByRole('button', { name: /add subject/i })
    fireEvent.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/subjects/new')
  })

  it('should display loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn())

    render(<SubjectsPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of subjects from Firestore', async () => {
    const mockSubjects = [
      {
        id: 'subject-1',
        data: () => ({
          name: 'Mathematics',
          code: 'MATH',
          maxScore: 100,
          description: 'Core subject',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'subject-2',
        data: () => ({
          name: 'English Language',
          code: 'ENG',
          maxScore: 100,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockSubjects })
      return jest.fn()
    })

    render(<SubjectsPage />)

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
      expect(screen.getByText('English Language')).toBeInTheDocument()
      expect(screen.getAllByText('MATH').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ENG').length).toBeGreaterThan(0)
    })
  })

  it('should filter subjects by tenant ID', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<SubjectsPage />)

    expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-123')
  })

  it('should show subject count', async () => {
    const mockSubjects = [
      {
        id: 'subject-1',
        data: () => ({
          name: 'Mathematics',
          code: 'MATH',
          maxScore: 100,
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'subject-2',
        data: () => ({
          name: 'English',
          code: 'ENG',
          maxScore: 100,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockSubjects })
      return jest.fn()
    })

    render(<SubjectsPage />)

    await waitFor(() => {
      expect(screen.getByText(/2.*subjects?/i)).toBeInTheDocument()
    })
  })

  it('should have Edit button for each subject', async () => {
    const mockSubjects = [
      {
        id: 'subject-1',
        data: () => ({
          name: 'Mathematics',
          code: 'MATH',
          maxScore: 100,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockSubjects })
      return jest.fn()
    })

    render(<SubjectsPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('should have Delete button for each subject', async () => {
    const mockSubjects = [
      {
        id: 'subject-1',
        data: () => ({
          name: 'Mathematics',
          code: 'MATH',
          maxScore: 100,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockSubjects })
      return jest.fn()
    })

    render(<SubjectsPage />)

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  it('should cleanup Firestore listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribe)

    const { unmount } = render(<SubjectsPage />)

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
