import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import ClassesPage from '@/app/dashboard/classes/page'

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

describe('Classes List Page', () => {
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

    render(<ClassesPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^classes$/i })).toBeInTheDocument()
  })

  it('should display empty state when no classes exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<ClassesPage />)

    await waitFor(() => {
      expect(screen.getByText(/no classes yet/i)).toBeInTheDocument()
    })
  })

  it('should show "Add Class" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<ClassesPage />)

    expect(screen.getByRole('button', { name: /add class/i })).toBeInTheDocument()
  })

  it('should show "Import CSV" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<ClassesPage />)

    expect(screen.getByRole('button', { name: /import csv/i })).toBeInTheDocument()
  })

  it('should navigate to add class page when clicking "Add Class"', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<ClassesPage />)

    const addButton = screen.getByRole('button', { name: /add class/i })
    fireEvent.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/classes/new')
  })

  it('should display loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn())

    render(<ClassesPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of classes from Firestore', async () => {
    const mockClasses = [
      {
        id: 'class-1',
        data: () => ({
          name: 'JSS 1A',
          level: 'JSS1',
          teacherId: 'teacher-1',
          studentCount: 25,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'class-2',
        data: () => ({
          name: 'SS 2B',
          level: 'SS2',
          teacherId: 'teacher-2',
          studentCount: 30,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockClasses })
      return jest.fn()
    })

    render(<ClassesPage />)

    await waitFor(() => {
      expect(screen.getByText('JSS 1A')).toBeInTheDocument()
      expect(screen.getByText('SS 2B')).toBeInTheDocument()
      expect(screen.getByText('25 students')).toBeInTheDocument()
      expect(screen.getByText('30 students')).toBeInTheDocument()
    })
  })

  it('should filter classes by tenant ID', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<ClassesPage />)

    expect(where).toHaveBeenCalledWith('tenantId', '==', 'tenant-123')
  })

  it('should show class count', async () => {
    const mockClasses = [
      {
        id: 'class-1',
        data: () => ({
          name: 'JSS 1A',
          level: 'JSS1',
          studentCount: 25,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
      {
        id: 'class-2',
        data: () => ({
          name: 'SS 2B',
          level: 'SS2',
          studentCount: 30,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockClasses })
      return jest.fn()
    })

    render(<ClassesPage />)

    await waitFor(() => {
      expect(screen.getByText(/2.*classes?/i)).toBeInTheDocument()
    })
  })

  it('should have Edit button for each class', async () => {
    const mockClasses = [
      {
        id: 'class-1',
        data: () => ({
          name: 'JSS 1A',
          level: 'JSS1',
          studentCount: 25,
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockClasses })
      return jest.fn()
    })

    render(<ClassesPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('should have Delete button for each class', async () => {
    const mockClasses = [
      {
        id: 'class-1',
        data: () => ({
          name: 'JSS 1A',
          level: 'JSS1',
          studentCount: 0, // No students
          academicYear: '2024/2025',
          createdAt: { toDate: () => new Date() },
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockClasses })
      return jest.fn()
    })

    render(<ClassesPage />)

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  it('should cleanup Firestore listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribe)

    const { unmount } = render(<ClassesPage />)

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
