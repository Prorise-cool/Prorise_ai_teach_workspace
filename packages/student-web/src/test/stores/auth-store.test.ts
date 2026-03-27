/**
 * 认证 store 测试。
 * 验证当前登录、登出流程是否按 RuoYi 契约保存和清理认证态。
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

const unauthorizedState = vi.hoisted(() => ({
  handler: null as null | ((message: string) => void),
}))

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

vi.mock('@/services/api/client', () => ({
  registerUnauthorizedHandler: vi.fn((handler: (message: string) => void) => {
    unauthorizedState.handler = handler
  }),
}))

import {
  fetchCurrentUserInfo,
  fetchLogin,
  fetchLogout,
  fetchRegister,
} from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'

const mockedFetchCurrentUserInfo = vi.mocked(fetchCurrentUserInfo)
const mockedFetchLogin = vi.mocked(fetchLogin)
const mockedFetchLogout = vi.mocked(fetchLogout)
const mockedFetchRegister = vi.mocked(fetchRegister)

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

  test('rehydrate 成功时会恢复本地会话并拉取用户上下文', async () => {
    localStorage.setItem('token', 'access-token')
    localStorage.setItem('refreshToken', 'refresh-token')
    mockedFetchCurrentUserInfo.mockResolvedValue({
      permissions: ['system:user:list'],
      roles: ['student'],
      user: {
        userName: 'alice',
      },
    })

    await useAuthStore.getState().initialize()

    expect(mockedFetchCurrentUserInfo).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().session).toEqual({
      accessToken: 'access-token',
      clientId: undefined,
      expireIn: undefined,
      refreshExpireIn: undefined,
      refreshToken: 'refresh-token',
      scope: undefined,
    })
  })

  test('rehydrate 失败时会清理失效认证态并回到未登录状态', async () => {
    localStorage.setItem('token', 'expired-access-token')
    localStorage.setItem('refreshToken', 'expired-refresh-token')
    mockedFetchCurrentUserInfo.mockRejectedValue(new Error('401'))

    await useAuthStore.getState().initialize()

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })

  test('注册成功时按 RuoYi 契约补齐字段，但不自动登录', async () => {
    mockedFetchRegister.mockResolvedValue(undefined)

    await useAuthStore.getState().register({
      confirmPassword: 'Password123',
      password: 'Password123',
      tenantId: '',
      userType: 'sys_user',
      username: 'alice',
      uuid: 'uuid-1',
    })

    expect(mockedFetchRegister).toHaveBeenCalledWith({
      clientId: 'e5cd7e4891bf95d1d19206ce24a7b32e',
      confirmPassword: 'Password123',
      grantType: 'password',
      password: 'Password123',
      tenantId: '000000',
      userType: 'sys_user',
      username: 'alice',
      uuid: 'uuid-1',
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().session).toBeNull()
  })

  test('收到 401 清理回调时会重置 store 与本地认证态', () => {
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
        permissions: ['system:user:list'],
        roles: ['student'],
        user: {
          userName: 'alice',
        },
      },
    })

    unauthorizedState.handler?.('登录状态已失效，请重新登录。')

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(useAuthStore.getState().initialized).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().session).toBeNull()
  })
})
