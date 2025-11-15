import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import StudentDetailPage from '@/app/dashboard/students/[id]/page'

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

describe('Student Detail Page', () => {
  const mockPush = jest.fn()
  const mockGetDoc = getDoc as jest.Mock
  const mockUpdateDoc = updateDoc as jest.Mock

  const mockStudentData = {
    firstName: 'John',
    middleName: 'Michael',
    lastName: 'Doe',
    admissionNumber: 'ADM001',
    dateOfBirth: { toDate: () => new Date('2010-01-01') },
    gender: 'male',
    currentClassId: 'class-1',
    address: '123 Main St',
    isActive: true,
    admissionDate: { toDate: () => new Date('2024-01-15') },
    guardianIds: [],
    tenantId: 'tenant-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ id: 'student-123' })
  })

  it('should render student name in header', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('John Michael Doe')).toBeInTheDocument()
    })
  })

  it('should display student information', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('ADM001')).toBeInTheDocument()
      expect(screen.getByText(/male/i)).toBeInTheDocument()
      expect(screen.getByText('123 Main St')).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching', () => {
    mockGetDoc.mockImplementation(() => new Promise(() => {}))

    render(<StudentDetailPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should show not found message if student does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/student not found/i)).toBeInTheDocument()
    })
  })

  it('should have edit button for admin', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })
  })

  it('should navigate to edit page when edit button clicked', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit/i })
      fireEvent.click(editButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students/student-123/edit')
  })

  it('should have back button', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  it('should navigate back to students list', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students')
  })

  it('should display active status badge', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/active/i)).toBeInTheDocument()
    })
  })

  it('should show deactivate button for active student', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
    })
  })

  it('should show activate button for inactive student', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...mockStudentData, isActive: false }),
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
    })
  })

  it('should toggle student active status', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })
    mockUpdateDoc.mockResolvedValue(undefined)

    render(<StudentDetailPage />)

    await waitFor(() => {
      const deactivateButton = screen.getByRole('button', { name: /deactivate/i })
      fireEvent.click(deactivateButton)
    })

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    const updateCall = mockUpdateDoc.mock.calls[0]
    const updateData = updateCall[1]
    expect(updateData.isActive).toBe(false)
  })

  it('should calculate and display age correctly', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockStudentData,
    })

    render(<StudentDetailPage />)

    await waitFor(() => {
      // Student born in 2010, so should be around 14-15 years old
      expect(screen.getByText(/14|15 years old/i)).toBeInTheDocument()
    })
  })
})
