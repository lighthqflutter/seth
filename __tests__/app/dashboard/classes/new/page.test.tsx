import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { addDoc } from 'firebase/firestore'
import NewClassPage from '@/app/dashboard/classes/new/page'

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

describe('New Class Page', () => {
  const mockPush = jest.fn()
  const mockAddDoc = addDoc as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render form title', () => {
    render(<NewClassPage />)
    expect(screen.getByRole('heading', { level: 1, name: /add class/i })).toBeInTheDocument()
  })

  it('should render all form fields', () => {
    render(<NewClassPage />)

    expect(screen.getByLabelText(/class name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/level/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/academic year/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/teacher id/i)).toBeInTheDocument()
  })

  it('should have Save and Cancel buttons', () => {
    render(<NewClassPage />)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should navigate back on cancel', () => {
    render(<NewClassPage />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/classes')
  })

  it('should show validation errors for empty required fields', async () => {
    render(<NewClassPage />)

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/class name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/level is required/i)).toBeInTheDocument()
      expect(screen.getByText(/academic year is required/i)).toBeInTheDocument()
    })

    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it('should validate academic year format', async () => {
    render(<NewClassPage />)

    const nameInput = screen.getByLabelText(/class name/i)
    const levelInput = screen.getByLabelText(/level/i)
    const yearInput = screen.getByLabelText(/academic year/i)

    fireEvent.change(nameInput, { target: { value: 'JSS 1A' } })
    fireEvent.change(levelInput, { target: { value: 'JSS1' } })
    fireEvent.change(yearInput, { target: { value: 'invalid' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/academic year must be in format yyyy\/yyyy/i)).toBeInTheDocument()
    })

    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it('should successfully create a new class', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-class-id' })

    render(<NewClassPage />)

    const nameInput = screen.getByLabelText(/class name/i)
    const levelInput = screen.getByLabelText(/level/i)
    const yearInput = screen.getByLabelText(/academic year/i)

    fireEvent.change(nameInput, { target: { value: 'JSS 1A' } })
    fireEvent.change(levelInput, { target: { value: 'JSS1' } })
    fireEvent.change(yearInput, { target: { value: '2024/2025' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
      const callArgs = mockAddDoc.mock.calls[0]
      const data = callArgs[1]

      expect(data.name).toBe('JSS 1A')
      expect(data.level).toBe('JSS1')
      expect(data.academicYear).toBe('2024/2025')
      expect(data.tenantId).toBe('tenant-123')
      expect(data.studentCount).toBe(0)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/classes')
  })

  it('should handle optional teacher ID field', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-class-id' })

    render(<NewClassPage />)

    const nameInput = screen.getByLabelText(/class name/i)
    const levelInput = screen.getByLabelText(/level/i)
    const yearInput = screen.getByLabelText(/academic year/i)
    const teacherInput = screen.getByLabelText(/teacher id/i)

    fireEvent.change(nameInput, { target: { value: 'JSS 1A' } })
    fireEvent.change(levelInput, { target: { value: 'JSS1' } })
    fireEvent.change(yearInput, { target: { value: '2024/2025' } })
    fireEvent.change(teacherInput, { target: { value: 'teacher-123' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
      const callArgs = mockAddDoc.mock.calls[0]
      const data = callArgs[1]

      expect(data.teacherId).toBe('teacher-123')
    })
  })

  it('should show error message on save failure', async () => {
    mockAddDoc.mockRejectedValue(new Error('Network error'))

    render(<NewClassPage />)

    const nameInput = screen.getByLabelText(/class name/i)
    const levelInput = screen.getByLabelText(/level/i)
    const yearInput = screen.getByLabelText(/academic year/i)

    fireEvent.change(nameInput, { target: { value: 'JSS 1A' } })
    fireEvent.change(levelInput, { target: { value: 'JSS1' } })
    fireEvent.change(yearInput, { target: { value: '2024/2025' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to create class/i)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should disable save button while submitting', async () => {
    mockAddDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<NewClassPage />)

    const nameInput = screen.getByLabelText(/class name/i)
    const levelInput = screen.getByLabelText(/level/i)
    const yearInput = screen.getByLabelText(/academic year/i)

    fireEvent.change(nameInput, { target: { value: 'JSS 1A' } })
    fireEvent.change(levelInput, { target: { value: 'JSS1' } })
    fireEvent.change(yearInput, { target: { value: '2024/2025' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
  })
})
