/**
 * 认证 store 测试。
 * 验证当前登录、登出流程是否按 RuoYi 契约保存和清理认证态。
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/api/auth', () => ({
  fetchCurrentUserInfo: vi.fn(),
  fetchLogin: vi.fn(),
  fetchLogout: vi.fn(),
  fetchRegister: vi.fn(),
}))

import {
  fetchCurrentUserInfo,
  fetchLogin,
  fetchLogout,
} from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'

const mockedFetchCurrentUserInfo = vi.mocked(fetchCurrentUserInfo)
const mockedFetchLogin = vi.mocked(fetchLogin)
const mockedFetchLogout = vi.mocked(fetchLogout)

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      busy: false,
      initialized: false,
      isAuthenticated: false,
      session: null,
      status: 'loading',
      userInfo: null,
    })
    vi.clearAllMocks()
  })

  test('登录时拼装 RuoYi 所需参数并持久化 token', async () => {
    mockedFetchLogin.mockResolvedValue({
      access_token: 'access-token',
      client_id: 'client-id',
      expire_in: 7200,
      refresh_expire_in: 86400,
      refresh_token: 'refresh-token',
      scope: 'all',
    })
    mockedFetchCurrentUserInfo.mockResolvedValue({
      permissions: ['system:user:list'],
      roles: ['student'],
      user: {
        userId: 1,
        userName: 'alice',
      },
    })

    await useAuthStore.getState().login({
      password: 'Password123',
      tenantId: '000000',
      username: 'alice',
    })

    expect(mockedFetchLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
        grantType: 'password',
        tenantId: '000000',
        username: 'alice',
      }),
    )
    expect(mockedFetchCurrentUserInfo).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('token')).toBe('access-token')
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  test('登出时先请求后端，再清理本地认证态', async () => {
    localStorage.setItem('token', 'access-token')
    localStorage.setItem('refreshToken', 'refresh-token')
    useAuthStore.setState({
      initialized: true,
      isAuthenticated: true,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
      status: 'authenticated',
      userInfo: {
        permissions: ['x'],
        roles: ['student'],
        user: {
          userName: 'alice',
        },
      },
    })
    mockedFetchLogout.mockResolvedValue(undefined)

    await useAuthStore.getState().logout()

    expect(mockedFetchLogout).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})
