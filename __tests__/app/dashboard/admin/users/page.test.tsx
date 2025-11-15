import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { getDocs, updateDoc } from 'firebase/firestore';
import UsersManagementPage from '@/app/dashboard/admin/users/page';

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

describe('Users Management Page', () => {
  const mockPush = jest.fn();
  const mockGetDocs = getDocs as jest.Mock;
  const mockUpdateDoc = updateDoc as jest.Mock;

  const mockUsers = [
    {
      id: 'user-1',
      name: 'John Admin',
      email: 'john@test.com',
      role: 'admin',
      phone: '+234 800 000 0001',
      isActive: true,
      tenantId: 'tenant-123',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-01') },
    },
    {
      id: 'user-2',
      name: 'Jane Teacher',
      email: 'jane@test.com',
      role: 'teacher',
      isActive: true,
      tenantId: 'tenant-123',
      createdAt: { toDate: () => new Date('2024-01-02') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
    },
    {
      id: 'user-3',
      name: 'Bob Parent',
      email: 'bob@test.com',
      role: 'parent',
      isActive: false,
      tenantId: 'tenant-123',
      createdAt: { toDate: () => new Date('2024-01-03') },
      updatedAt: { toDate: () => new Date('2024-01-03') },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    mockGetDocs.mockResolvedValue({
      docs: mockUsers.map((user) => ({
        id: user.id,
        data: () => user,
      })),
    });

    mockUpdateDoc.mockResolvedValue(undefined);

    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render page title and description', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Manage all users in your school')).toBeInTheDocument();
    });
  });

  it('should render add user button', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });
  });

  it('should navigate to new user page when add button is clicked', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/admin/users/new');
  });

  it('should display statistics cards', async () => {
    render(<UsersManagementPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Check statistics labels are displayed
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Teachers')).toBeInTheDocument();
    expect(screen.getByText('Parents')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0); // Stats card + status badges
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0); // Stats card + status badge

    // Check counts
    expect(screen.getByText('3')).toBeInTheDocument(); // Total users
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Admin and parent count
    expect(screen.getByText('2')).toBeInTheDocument(); // Active count
  });

  it('should load and display all users', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Parent')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('should filter users by search term', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'jane' } });

    await waitFor(() => {
      expect(screen.queryByText('John Admin')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
      expect(screen.queryByText('Bob Parent')).not.toBeInTheDocument();
    });
  });

  it('should filter users by role', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    const roleFilter = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleFilter, { target: { value: 'teacher' } });

    await waitFor(() => {
      expect(screen.queryByText('John Admin')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
      expect(screen.queryByText('Bob Parent')).not.toBeInTheDocument();
    });
  });

  it('should filter users by status', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'inactive' } });

    await waitFor(() => {
      expect(screen.queryByText('John Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Teacher')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Parent')).toBeInTheDocument();
    });
  });

  it('should combine search and filters', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Filter by role and search
    const roleFilter = screen.getByDisplayValue('All Roles');
    fireEvent.change(roleFilter, { target: { value: 'admin' } });

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'john' } });

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
      expect(screen.queryByText('Jane Teacher')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Parent')).not.toBeInTheDocument();
    });
  });

  it('should change user role', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
    });

    // Find Jane's role select and change it
    const selects = screen.getAllByRole('combobox');
    const janeRoleSelect = selects.find(
      (select) => (select as HTMLSelectElement).value === 'teacher'
    );

    if (janeRoleSelect) {
      fireEvent.change(janeRoleSelect, { target: { value: 'admin' } });

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('change this user\'s role from teacher to admin')
        );
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    }
  });

  it('should toggle user status', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Teacher')).toBeInTheDocument();
    });

    // Find and click deactivate button for Jane (who is active)
    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    if (deactivateButtons.length > 0) {
      fireEvent.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('deactivate this user')
        );
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    }
  });

  it('should navigate to user activity page', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    const activityButtons = screen.getAllByRole('button', { name: /activity/i });
    fireEvent.click(activityButtons[0]);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/dashboard/users/'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/activity'));
  });

  it('should show loading state', () => {
    mockGetDocs.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<UsersManagementPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display results count', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/showing 3 of 3 users/i)).toBeInTheDocument();
    });
  });

  it('should show no users message when filtered to empty', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });
});
