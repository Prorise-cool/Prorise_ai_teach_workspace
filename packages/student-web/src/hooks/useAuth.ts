/**
 * 认证能力选择器 Hook。
 * 统一从 store 暴露页面需要的认证状态与动作，减少组件直接感知 store 细节。
 */
import { useAuthStore } from '@/stores/auth-store'

export function useAuth() {
  const busy = useAuthStore(state => state.busy)
  const initialized = useAuthStore(state => state.initialized)
  const initialize = useAuthStore(state => state.initialize)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const login = useAuthStore(state => state.login)
  const logout = useAuthStore(state => state.logout)
  const register = useAuthStore(state => state.register)
  const session = useAuthStore(state => state.session)
  const status = useAuthStore(state => state.status)
  const userInfo = useAuthStore(state => state.userInfo)

  return {
    busy,
    initialize,
    initialized,
    isAuthenticated,
    login,
    logout,
    register,
    session,
    status,
    userInfo,
  }
}
