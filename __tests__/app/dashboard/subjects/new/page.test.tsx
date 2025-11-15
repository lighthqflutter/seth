import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { addDoc } from 'firebase/firestore'
import NewSubjectPage from '@/app/dashboard/subjects/new/page'

jest.mock('firebase/firestore')
jest.mock('next/navigation')
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-admin', role: 'admin', tenantId: 'tenant-123' },
    loading: false,
  })),
}))

describe('New Subject Page', () => {
  const mockPush = jest.fn()
  const mockAddDoc = addDoc as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render form title', () => {
    render(<NewSubjectPage />)
    expect(screen.getByRole('heading', { level: 1, name: /add subject/i })).toBeInTheDocument()
  })

  it('should render all form fields', () => {
    render(<NewSubjectPage />)
    expect(screen.getByLabelText(/subject name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subject code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/max score/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('should validate code format', async () => {
    render(<NewSubjectPage />)

    fireEvent.change(screen.getByLabelText(/subject name/i), { target: { value: 'Math' } })
    fireEvent.change(screen.getByLabelText(/subject code/i), { target: { value: 'math-123' } })
    fireEvent.change(screen.getByLabelText(/max score/i), { target: { value: '100' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/code must be uppercase letters and numbers only/i)).toBeInTheDocument()
    })
  })

  it('should validate max score is positive', async () => {
    render(<NewSubjectPage />)

    fireEvent.change(screen.getByLabelText(/subject name/i), { target: { value: 'Math' } })
    fireEvent.change(screen.getByLabelText(/subject code/i), { target: { value: 'MATH' } })
    fireEvent.change(screen.getByLabelText(/max score/i), { target: { value: '-10' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/max score must be a positive number/i)).toBeInTheDocument()
    })
  })

  it('should successfully create a new subject', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-subject-id' })

    render(<NewSubjectPage />)

    fireEvent.change(screen.getByLabelText(/subject name/i), { target: { value: 'Mathematics' } })
    fireEvent.change(screen.getByLabelText(/subject code/i), { target: { value: 'MATH' } })
    fireEvent.change(screen.getByLabelText(/max score/i), { target: { value: '100' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard/subjects')
  })
})
