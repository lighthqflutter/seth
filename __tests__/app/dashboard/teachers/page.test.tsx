import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import TeachersPage from '@/app/dashboard/teachers/page'

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

describe('Teachers List Page', () => {
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

    render(<TeachersPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^teachers$/i })).toBeInTheDocument()
  })

  it('should display empty state when no teachers exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TeachersPage />)

    await waitFor(() => {
      expect(screen.getByText(/no teachers yet/i)).toBeInTheDocument()
    })
  })

  it('should show "Add Teacher" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TeachersPage />)

    expect(screen.getByRole('button', { name: /add teacher/i })).toBeInTheDocument()
  })

  it('should show "Import CSV" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TeachersPage />)

    expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
  })

  it('should navigate to add teacher page when clicking "Add Teacher"', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TeachersPage />)

    const addButton = screen.getByRole('button', { name: /add teacher/i })
    fireEvent.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/teachers/new')
  })

  it('should display loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn())

    render(<TeachersPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of teachers from Firestore', async () => {
    const mockTeachers = [
      {
        id: 'teacher-1',
        data: () => ({
          name: 'John Doe',
          email: 'john@school.com',
          phone: '1234567890',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'teacher-2',
        data: () => ({
          name: 'Jane Smith',
          email: 'jane@school.com',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTeachers })
      return jest.fn()
    })

    render(<TeachersPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('john@school.com')).toBeInTheDocument()
      expect(screen.getByText('jane@school.com')).toBeInTheDocument()
    })
  })

  it('should filter teachers by tenant ID and role', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<TeachersPage />)

    expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-123')
    expect(where).toHaveBeenCalledWith('role', '==', 'teacher')
  })

  it('should show teacher count', async () => {
    const mockTeachers = [
      {
        id: 'teacher-1',
        data: () => ({
          name: 'John Doe',
          email: 'john@school.com',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'teacher-2',
        data: () => ({
          name: 'Jane Smith',
          email: 'jane@school.com',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTeachers })
      return jest.fn()
    })

    render(<TeachersPage />)

    await waitFor(() => {
      expect(screen.getByText(/2.*teachers?/i)).toBeInTheDocument()
    })
  })

  it('should have Edit button for each teacher', async () => {
    const mockTeachers = [
      {
        id: 'teacher-1',
        data: () => ({
          name: 'John Doe',
          email: 'john@school.com',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTeachers })
      return jest.fn()
    })

    render(<TeachersPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('should have Deactivate/Activate button for each teacher', async () => {
    const mockTeachers = [
      {
        id: 'teacher-1',
        data: () => ({
          name: 'John Doe',
          email: 'john@school.com',
          role: 'teacher',
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockTeachers })
      return jest.fn()
    })

    render(<TeachersPage />)

    await waitFor(() => {
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      expect(deactivateButtons.length).toBeGreaterThan(0)
    })
  })

  it('should cleanup Firestore listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribe)

    const { unmount } = render(<TeachersPage />)

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
