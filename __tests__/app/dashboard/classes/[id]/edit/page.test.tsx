import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import EditClassPage from '@/app/dashboard/classes/[id]/edit/page'

// Mock Firebase and auth
jest.mock('firebase/firestore')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))
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

describe('Edit Class Page', () => {
  const mockPush = jest.fn()
  const mockGetDoc = getDoc as jest.Mock
  const mockUpdateDoc = updateDoc as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ id: 'class-123' })
  })

  it('should render form title', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: '',
      }),
    })

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /edit class/i })).toBeInTheDocument()
    })
  })

  it('should load and display existing class data', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: 'teacher-123',
      }),
    })

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSS 1A')).toBeInTheDocument()
      expect(screen.getByDisplayValue('JSS1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024/2025')).toBeInTheDocument()
      expect(screen.getByDisplayValue('teacher-123')).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching data', () => {
    mockGetDoc.mockImplementation(() => new Promise(() => {}))

    render(<EditClassPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should show not found message if class does not exist', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    })

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByText(/class not found/i)).toBeInTheDocument()
    })
  })

  it('should successfully update a class', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
        teacherId: '',
      }),
    })
    mockUpdateDoc.mockResolvedValue(undefined)

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSS 1A')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/class name/i)
    fireEvent.change(nameInput, { target: { value: 'JSS 1B' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled()
      const callArgs = mockUpdateDoc.mock.calls[0]
      const data = callArgs[1]
      expect(data.name).toBe('JSS 1B')
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/classes')
  })

  it('should validate required fields', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
      }),
    })

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSS 1A')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/class name/i)
    fireEvent.change(nameInput, { target: { value: '' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/class name is required/i)).toBeInTheDocument()
    })

    expect(mockUpdateDoc).not.toHaveBeenCalled()
  })

  it('should navigate back on cancel', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
      }),
    })

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSS 1A')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/classes')
  })

  it('should show error message on update failure', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'JSS 1A',
        level: 'JSS1',
        academicYear: '2024/2025',
      }),
    })
    mockUpdateDoc.mockRejectedValue(new Error('Network error'))

    render(<EditClassPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('JSS 1A')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to update class/i)).toBeInTheDocument()
    })
  })
})
