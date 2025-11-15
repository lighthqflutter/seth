import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { onAuthStateChanged } from 'firebase/auth'

// Mock Firebase auth
jest.mock('@/lib/firebase/client', () => ({
  auth: {},
}))

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    // Mock onAuthStateChanged to not call the callback immediately
    ;(onAuthStateChanged as jest.Mock).mockImplementation(() => jest.fn())

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
  })

  it('should set user when authenticated', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {
          role: 'admin',
          tenantId: 'tenant-123',
        },
      }),
    }

    // Mock onAuthStateChanged to call callback with user
    ;(onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(mockUser)
      return jest.fn() // Return unsubscribe function
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeTruthy()
    expect(result.current.user?.email).toBe('test@example.com')
    expect(result.current.user?.role).toBe('admin')
    expect(result.current.user?.tenantId).toBe('tenant-123')
  })

  it('should set user to null when not authenticated', async () => {
    // Mock onAuthStateChanged to call callback with null
    ;(onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(null)
      return jest.fn()
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBe(null)
  })

  it('should cleanup subscription on unmount', () => {
    const unsubscribe = jest.fn()
    ;(onAuthStateChanged as jest.Mock).mockImplementation(() => unsubscribe)

    const { unmount } = renderHook(() => useAuth())

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
