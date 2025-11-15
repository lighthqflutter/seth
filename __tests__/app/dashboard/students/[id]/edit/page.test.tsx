import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import EditStudentPage from '@/app/dashboard/students/[id]/edit/page'

jest.mock('firebase/firestore')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-admin', role: 'admin', tenantId: 'tenant-123' },
    loading: false,
  })),
}))

describe('Edit Student Page', () => {
  const mockPush = jest.fn()
  const mockGetDoc = getDoc as jest.Mock
  const mockUpdateDoc = updateDoc as jest.Mock
  const mockGetDocs = getDocs as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ id: 'student-123' })

    // Mock classes query
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'class-1', data: () => ({ name: 'JSS 1A', level: 'JSS1' }) },
        { id: 'class-2', data: () => ({ name: 'SS 2B', level: 'SS2' }) },
      ],
    })
  })

  it('should render form title', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
        tenantId: 'tenant-123',
      }),
    })

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /edit student/i })).toBeInTheDocument()
    })
  })

  it('should load and display student data', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
        address: '123 Main St',
        tenantId: 'tenant-123',
      }),
    })

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Michael')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ADM001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2010-01-01')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching data', () => {
    mockGetDoc.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<EditStudentPage />)

    expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
  })

  it('should show not found message if student does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    })

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByText(/student not found/i)).toBeInTheDocument()
    })
  })

  it('should validate required fields on update', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
        tenantId: 'tenant-123',
      }),
    })

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    // Clear required field
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })

    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('should successfully update student data', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
      }),
    })
    mockUpdateDoc.mockResolvedValue(undefined)

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    // Update fields
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    // Verify update data
    const updateCall = mockUpdateDoc.mock.calls[0]
    const updateData = updateCall[1]
    expect(updateData.firstName).toBe('Jane')
    expect(updateData.lastName).toBe('Smith')
    expect(updateData.updatedAt).toBeDefined()

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students')
  })

  it('should handle update errors', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
      }),
    })
    mockUpdateDoc.mockRejectedValue(new Error('Network error'))

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to update student/i)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should navigate back to students list on cancel', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
        tenantId: 'tenant-123',
      }),
    })

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students')
  })

  it('should disable submit button while saving', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: 'John',
        lastName: 'Doe',
        admissionNumber: 'ADM001',
        dateOfBirth: { toDate: () => new Date('2010-01-01') },
        gender: 'male',
        currentClassId: 'class-1',
      }),
    })
    mockUpdateDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<EditStudentPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
  })
})
