import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import StudentsPage from '@/app/dashboard/students/page'

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

describe('Students List Page', () => {
  const mockPush = jest.fn()
  const mockCollection = collection as jest.Mock
  const mockQuery = query as jest.Mock
  const mockWhere = where as jest.Mock
  const mockOnSnapshot = onSnapshot as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render page title and header', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    expect(screen.getByRole('heading', { level: 1, name: /^students$/i })).toBeInTheDocument()
  })

  it('should display empty state when no students exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no students yet/i)).toBeInTheDocument()
    })
  })

  it('should show "Add Student" button for admin', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    const addButton = screen.getByRole('button', { name: /add student/i })
    expect(addButton).toBeInTheDocument()
  })

  it('should navigate to add student page when clicking "Add Student"', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    const addButton = screen.getByRole('button', { name: /add student/i })
    fireEvent.click(addButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students/new')
  })

  it('should display loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => jest.fn())

    render(<StudentsPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display list of students from Firestore', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        data: () => ({
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: 'STU001',
          currentClass: 'JSS 1',
          dateOfBirth: { toDate: () => new Date('2010-01-01') },
          status: 'active',
        }),
      },
      {
        id: 'student-2',
        data: () => ({
          firstName: 'Jane',
          lastName: 'Smith',
          admissionNumber: 'STU002',
          currentClass: 'JSS 2',
          dateOfBirth: { toDate: () => new Date('2009-05-15') },
          status: 'active',
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockStudents })
      return jest.fn()
    })

    render(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('STU001')).toBeInTheDocument()
      expect(screen.getByText('STU002')).toBeInTheDocument()
    })
  })

  it('should filter students by tenant ID', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    expect(mockWhere).toHaveBeenCalledWith('tenantId', '==', 'tenant-123')
  })

  it('should have search input field', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] })
      return jest.fn()
    })

    render(<StudentsPage />)

    expect(screen.getByPlaceholderText(/search students/i)).toBeInTheDocument()
  })

  it('should filter students by search query', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        data: () => ({
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: 'STU001',
          currentClass: 'JSS 1',
          dateOfBirth: { toDate: () => new Date('2010-01-01') },
          status: 'active',
        }),
      },
      {
        id: 'student-2',
        data: () => ({
          firstName: 'Jane',
          lastName: 'Smith',
          admissionNumber: 'STU002',
          currentClass: 'JSS 2',
          dateOfBirth: { toDate: () => new Date('2009-05-15') },
          status: 'active',
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockStudents })
      return jest.fn()
    })

    render(<StudentsPage />)

    const searchInput = screen.getByPlaceholderText(/search students/i)
    fireEvent.change(searchInput, { target: { value: 'john' } })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('should show student count', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        data: () => ({
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: 'STU001',
          currentClass: 'JSS 1',
          dateOfBirth: { toDate: () => new Date('2010-01-01') },
          status: 'active',
        }),
      },
      {
        id: 'student-2',
        data: () => ({
          firstName: 'Jane',
          lastName: 'Smith',
          admissionNumber: 'STU002',
          currentClass: 'JSS 2',
          dateOfBirth: { toDate: () => new Date('2009-05-15') },
          status: 'active',
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockStudents })
      return jest.fn()
    })

    render(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByText(/2.*students?/i)).toBeInTheDocument()
    })
  })

  it('should have Edit action button for each student', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        data: () => ({
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: 'STU001',
          currentClass: 'JSS 1',
          dateOfBirth: { toDate: () => new Date('2010-01-01') },
          status: 'active',
        }),
      },
    ]

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockStudents })
      return jest.fn()
    })

    render(<StudentsPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('should cleanup Firestore listener on unmount', () => {
    const unsubscribe = jest.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribe)

    const { unmount } = render(<StudentsPage />)

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
