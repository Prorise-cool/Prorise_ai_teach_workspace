/**
 * 认证状态容器。
 * 统一维护初始化、登录、注册、登出和未授权清理流程，避免页面自行拼接认证语义。
 */
import { toast } from 'sonner'
import { create } from 'zustand'

import {
  type CurrentUserInfo,
  fetchCurrentUserInfo,
  fetchLogin,
  fetchLogout,
  fetchRegister,
  type LoginPayload,
  type RegisterPayload,
} from '@/lib/api/auth'
import { env } from '@/lib/env'
import {
  type AuthSession,
  clearAuthStorage,
  loadAuthSession,
  saveAuthSession,
} from '@/lib/storage/auth'
import { registerUnauthorizedHandler } from '@/services/api/client'

interface AuthState {
  busy: boolean
  initialize: () => Promise<void>
  initialized: boolean
  isAuthenticated: boolean
  login: (payload: Omit<LoginPayload, 'clientId' | 'grantType'>) => Promise<void>
  logout: () => Promise<void>
  register: (payload: Omit<RegisterPayload, 'clientId' | 'grantType'>) => Promise<void>
  session: AuthSession | null
  status: 'authenticated' | 'loading' | 'unauthenticated'
  userInfo: CurrentUserInfo | null
}

export const useAuthStore = create<AuthState>(() => ({
  busy: false,
  initialized: false,
  isAuthenticated: false,
  session: null,
  status: 'loading',
  userInfo: null,
  async initialize() {
    const session = loadAuthSession()

    if (!session) {
      set({
        initialized: true,
        isAuthenticated: false,
        session: null,
        status: 'unauthenticated',
        userInfo: null,
      })
      return
    }

    set({
      busy: false,
      initialized: false,
      isAuthenticated: false,
      session,
      status: 'loading',
      userInfo: null,
    })

    try {
      const userInfo = await fetchCurrentUserInfo()
      set({
        initialized: true,
        isAuthenticated: true,
        session,
        status: 'authenticated',
        userInfo,
      })
    } catch {
      clearSession()
      set({
        initialized: true,
      })
    }
  },
  async login(payload) {
    set({
      busy: true,
      status: 'loading',
    })

    try {
      const token = await fetchLogin({
        ...payload,
        clientId: env.VITE_APP_CLIENT_ID,
        grantType: 'password',
        tenantId: payload.tenantId || '000000',
      })

      const session: AuthSession = {
        accessToken: token.access_token,
        clientId: token.client_id,
        expireIn: token.expire_in,
        refreshExpireIn: token.refresh_expire_in,
        refreshToken: token.refresh_token,
        scope: token.scope,
      }

      saveAuthSession(session)

      const userInfo = await fetchCurrentUserInfo()
      set({
        busy: false,
        initialized: true,
        isAuthenticated: true,
        session,
        status: 'authenticated',
        userInfo,
      })
      toast.success('登录成功，欢迎回来。')
    } catch (error) {
      clearSession()
      set({
        busy: false,
        initialized: true,
        status: 'unauthenticated',
      })
      throw error
    }
  },
  async logout() {
    set({ busy: true })

    try {
      await fetchLogout()
    } finally {
      clearSession()
      set({
        busy: false,
        initialized: true,
      })
      toast.success('已退出登录。')
    }
  },
  async register(payload) {
    set({ busy: true })

    try {
      await fetchRegister({
        ...payload,
        clientId: env.VITE_APP_CLIENT_ID,
        grantType: 'password',
        tenantId: payload.tenantId || '000000',
        userType: 'sys_user',
      })
      set({ busy: false })
      toast.success('注册成功，请使用新账号登录。')
    } catch (error) {
      set({ busy: false })
      throw error
    }
  },
}))

registerUnauthorizedHandler(message => {
  const previousSession = get().session

  // 统一按未授权语义清空本地会话，避免页面或单个接口各自处理 401。
  clearSession()
  set({
    busy: false,
    initialized: true,
  })

  if (previousSession) {
    toast.error(message || '登录状态已失效，请重新登录。')
  }
})

function clearSession() {
  clearAuthStorage()
  useAuthStore.setState({
    isAuthenticated: false,
    session: null,
    status: 'unauthenticated',
    userInfo: null,
  })
}

function get() {
  return useAuthStore.getState()
}

function set(partial: Partial<AuthState>) {
  useAuthStore.setState(partial)
}
