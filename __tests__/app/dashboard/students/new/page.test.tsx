import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore'
import NewStudentPage from '@/app/dashboard/students/new/page'

jest.mock('firebase/firestore')
jest.mock('next/navigation')
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { uid: 'test-admin', name: 'Test Admin', email: 'admin@test.com', role: 'admin', tenantId: 'tenant-123' },
    loading: false,
  })),
}))
jest.mock('@/lib/auditLogger', () => ({
  logAudit: jest.fn(() => Promise.resolve()),
}))

describe('New Student Page', () => {
  const mockPush = jest.fn()
  const mockAddDoc = addDoc as jest.Mock
  const mockGetDocs = getDocs as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Mock addDoc to return a docRef with id
    mockAddDoc.mockResolvedValue({ id: 'student-123' })

    // Mock classes query
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'class-1', data: () => ({ name: 'JSS 1A', level: 'JSS1' }) },
        { id: 'class-2', data: () => ({ name: 'SS 2B', level: 'SS2' }) },
      ],
    })
  })

  it('should render form title', () => {
    render(<NewStudentPage />)
    expect(screen.getByRole('heading', { level: 1, name: /add student/i })).toBeInTheDocument()
  })

  it('should render all required form fields', () => {
    render(<NewStudentPage />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/admission number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/current class/i)).toBeInTheDocument()
  })

  it('should render optional fields', () => {
    render(<NewStudentPage />)
    expect(screen.getByLabelText(/middle name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
  })

  it('should have save and cancel buttons', () => {
    render(<NewStudentPage />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should navigate to students list on cancel', () => {
    render(<NewStudentPage />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockPush).toHaveBeenCalledWith('/dashboard/students')
  })

  it('should validate required fields', async () => {
    render(<NewStudentPage />)

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/admission number is required/i)).toBeInTheDocument()
    })

    expect(mockAddDoc).not.toHaveBeenCalled()
  })

  it('should validate date of birth is in the past', async () => {
    render(<NewStudentPage />)

    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateString = futureDate.toISOString().split('T')[0]

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: futureDateString } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/date of birth must be in the past/i)).toBeInTheDocument()
    })
  })

  it('should validate gender selection', async () => {
    render(<NewStudentPage />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/gender is required/i)).toBeInTheDocument()
    })
  })

  it('should validate class selection', async () => {
    render(<NewStudentPage />)

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    // Select gender
    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/class is required/i)).toBeInTheDocument()
    })
  })

  it('should successfully create a new student with all required fields', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-student-id' })

    render(<NewStudentPage />)

    // Wait for classes to load first
    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      expect(classSelect.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    const classSelect = screen.getByLabelText(/current class/i)
    fireEvent.change(classSelect, { target: { value: 'class-1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
    })

    // Verify data structure
    const callArgs = mockAddDoc.mock.calls[0]
    const data = callArgs[1]
    expect(data.firstName).toBe('John')
    expect(data.lastName).toBe('Doe')
    expect(data.admissionNumber).toBe('ADM001')
    expect(data.gender).toBe('male')
    expect(data.currentClassId).toBe('class-1')
    expect(data.tenantId).toBe('tenant-123')
    expect(data.isActive).toBe(true)
    expect(data.guardianIds).toEqual([])

    expect(mockPush).toHaveBeenCalledWith('/dashboard/students')
  })

  it('should handle optional fields', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-student-id' })

    render(<NewStudentPage />)

    // Wait for classes to load
    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      expect(classSelect.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/middle name/i), { target: { value: 'Mary' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM002' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2011-05-15' } })
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Main St' } })

    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'female' } })

    const classSelect = screen.getByLabelText(/current class/i)
    fireEvent.change(classSelect, { target: { value: 'class-2' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
    })

    const callArgs = mockAddDoc.mock.calls[0]
    const data = callArgs[1]
    expect(data.middleName).toBe('Mary')
    expect(data.address).toBe('123 Main St')
  })

  it('should show error message on save failure', async () => {
    mockAddDoc.mockRejectedValue(new Error('Network error'))

    render(<NewStudentPage />)

    // Wait for classes to load
    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      expect(classSelect.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    const classSelect = screen.getByLabelText(/current class/i)
    fireEvent.change(classSelect, { target: { value: 'class-1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to create student/i)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should disable submit button while saving', async () => {
    mockAddDoc.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<NewStudentPage />)

    // Wait for classes to load
    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      expect(classSelect.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    const classSelect = screen.getByLabelText(/current class/i)
    fireEvent.change(classSelect, { target: { value: 'class-1' } })

    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })

  it('should load available classes on mount', async () => {
    render(<NewStudentPage />)

    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      const options = Array.from(classSelect.options).map(opt => opt.textContent)

      expect(options).toContain('JSS 1A')
      expect(options).toContain('SS 2B')
    })
  })

  it('should set admission date to current date by default', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-student-id' })

    render(<NewStudentPage />)

    // Wait for classes to load
    await waitFor(() => {
      const classSelect = screen.getByLabelText(/current class/i) as HTMLSelectElement
      expect(classSelect.options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/admission number/i), { target: { value: 'ADM001' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2010-01-01' } })

    const genderSelect = screen.getByLabelText(/gender/i)
    fireEvent.change(genderSelect, { target: { value: 'male' } })

    const classSelect = screen.getByLabelText(/current class/i)
    fireEvent.change(classSelect, { target: { value: 'class-1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled()
    })

    const callArgs = mockAddDoc.mock.calls[0]
    const data = callArgs[1]
    expect(data.admissionDate).toBeDefined()
  })
})
