import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { addDoc, getDocs } from 'firebase/firestore';
import NewUserPage from '@/app/dashboard/admin/users/new/page';

jest.mock('firebase/firestore');
jest.mock('next/navigation');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      uid: 'admin-123',
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin',
      tenantId: 'tenant-123',
    },
    loading: false,
  })),
}));
jest.mock('@/lib/auditLogger', () => ({
  logAudit: jest.fn(() => Promise.resolve()),
}));

describe('New User Page', () => {
  const mockPush = jest.fn();
  const mockAddDoc = addDoc as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    // Mock empty email check (no existing users)
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockAddDoc.mockResolvedValue({ id: 'new-user-123' });

    // Mock window.alert
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render form title and description', () => {
    render(<NewUserPage />);

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByText('Add a new user to your school system')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<NewUserPage />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user is active/i)).toBeInTheDocument();
  });

  it('should have back button', () => {
    render(<NewUserPage />);

    const backButton = screen.getByRole('button', { name: /back to users/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/admin/users');
  });

  it('should validate required fields', async () => {
    render(<NewUserPage />);

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Role is required')).toBeInTheDocument();
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should validate name length', async () => {
    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('should validate email format and prevent submission', async () => {
    render(<NewUserPage />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const roleSelect = screen.getByLabelText(/user role/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    const submitButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(submitButton);

    // Wait a bit to ensure form submission is attempted
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have created user due to validation error
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should validate phone number format if provided', async () => {
    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: 'invalid' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
    });
  });

  it('should successfully create a new user with required fields', async () => {
    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@test.com' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });

    const callArgs = mockAddDoc.mock.calls[0];
    const userData = callArgs[1];

    expect(userData.name).toBe('John Doe');
    expect(userData.email).toBe('john@test.com');
    expect(userData.role).toBe('teacher');
    expect(userData.isActive).toBe(true);
    expect(userData.tenantId).toBe('tenant-123');

    expect(global.alert).toHaveBeenCalledWith('User created successfully!');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/admin/users');
  });

  it('should successfully create a user with optional phone', async () => {
    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane@test.com' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+234 800 000 0000' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });

    const callArgs = mockAddDoc.mock.calls[0];
    const userData = callArgs[1];

    expect(userData.phone).toBe('+234 800 000 0000');
  });

  it('should check for duplicate email', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-user' }],
    });

    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'existing@test.com' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('A user with this email already exists')).toBeInTheDocument();
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('should show role description when role is selected', async () => {
    render(<NewUserPage />);

    const roleSelect = screen.getByLabelText(/user role/i);

    // Select admin
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    await waitFor(() => {
      expect(screen.getByText(/can manage all aspects of the system/i)).toBeInTheDocument();
    });

    // Select teacher
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });
    await waitFor(() => {
      expect(screen.getByText(/can manage assigned classes/i)).toBeInTheDocument();
    });

    // Select parent
    fireEvent.change(roleSelect, { target: { value: 'parent' } });
    await waitFor(() => {
      expect(screen.getByText(/can view their children's results/i)).toBeInTheDocument();
    });
  });

  it('should toggle active status', () => {
    render(<NewUserPage />);

    const activeCheckbox = screen.getByLabelText(/user is active/i);
    expect(activeCheckbox).toBeChecked(); // Default is true

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).toBeChecked();
  });

  it('should handle creation error', async () => {
    mockAddDoc.mockRejectedValue(new Error('Network error'));

    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@test.com' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should disable submit button while saving', async () => {
    mockAddDoc.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@test.com' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    const submitButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });
  });

  it('should clear field error when user types', async () => {
    render(<NewUserPage />);

    // Trigger validation errors
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    // Type in name field
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });

    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  it('should have cancel button that navigates back', () => {
    render(<NewUserPage />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/admin/users');
  });

  it('should normalize email to lowercase', async () => {
    render(<NewUserPage />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'John@TEST.COM' } });

    const roleSelect = screen.getByLabelText(/user role/i);
    fireEvent.change(roleSelect, { target: { value: 'teacher' } });

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });

    const callArgs = mockAddDoc.mock.calls[0];
    const userData = callArgs[1];

    expect(userData.email).toBe('john@test.com');
  });
});
