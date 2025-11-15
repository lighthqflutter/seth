import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import TermsPage from '@/app/dashboard/terms/page'

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

describe('Terms List Page', () => {
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

    render(<TermsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^terms$/i })).toBeInTheDocument()
  })

  it('should display empty state when no terms exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TermsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no terms yet/i)).toBeInTheDocument()
    })
  })

  it('should show "Add Term" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TermsPage />)

    expect(screen.getByRole('button', { name: /add term/i })).toBeInTheDocument()
  })

  it('should show "Import CSV" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TermsPage />)

    expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
  })

  it('should navigate to add term page when clicking "Add Term"', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TermsPage />)

    const addButton = screen.getByRole('button', { name: /add term/i })
    fireEvent.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/terms/new')
  })

  it('should display loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn())

    render(<TermsPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of terms from Firestore', async () => {
    const mockTerms = [
      {
        id: 'term-1',
        data: () => ({
          name: 'First Term 2024/2025',
          startDate: { toDate: () => new Date('2024-09-01') },
          endDate: { toDate: () => new Date('2024-12-15') },
          isCurrent: true,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'term-2',
        data: () => ({
          name: 'Second Term 2024/2025',
          startDate: { toDate: () => new Date('2025-01-06') },
          endDate: { toDate: () => new Date('2025-04-15') },
          isCurrent: false,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTerms })
      return jest.fn()
    })

    render(<TermsPage />)

    await waitFor(() => {
      expect(screen.getByText('First Term 2024/2025')).toBeInTheDocument()
      expect(screen.getByText('Second Term 2024/2025')).toBeInTheDocument()
      expect(screen.getAllByText('2024/2025').length).toBeGreaterThan(0)
    })
  })

  it('should filter terms by tenant ID', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TermsPage />)

    expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-123')
  })

  it('should show term count', async () => {
    const mockTerms = [
      {
        id: 'term-1',
        data: () => ({
          name: 'First Term',
          startDate: { toDate: () => new Date() },
          endDate: { toDate: () => new Date() },
          isCurrent: true,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'term-2',
        data: () => ({
          name: 'Second Term',
          startDate: { toDate: () => new Date() },
          endDate: { toDate: () => new Date() },
          isCurrent: false,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTerms })
      return jest.fn()
    })

    render(<TermsPage />)

    await waitFor(() => {
      expect(screen.getByText(/2.*terms?/i)).toBeInTheDocument()
    })
  })

  it('should have Edit button for each term', async () => {
    const mockTerms = [
      {
        id: 'term-1',
        data: () => ({
          name: 'First Term',
          startDate: { toDate: () => new Date() },
          endDate: { toDate: () => new Date() },
          isCurrent: true,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTerms })
      return jest.fn()
    })

    render(<TermsPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('should have Delete button for each term', async () => {
    const mockTerms = [
      {
        id: 'term-1',
        data: () => ({
          name: 'First Term',
          startDate: { toDate: () => new Date() },
          endDate: { toDate: () => new Date() },
          isCurrent: true,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTerms })
      return jest.fn()
    })

    render(<TermsPage />)

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  it('should cleanup Firestore listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribe)

    const { unmount } = render(<TermsPage />)

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
