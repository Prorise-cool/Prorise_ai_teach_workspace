/**
 * 认证存储层。
 * 统一管理 access token、refresh token 以及其附属元数据的本地持久化格式。
 */
/** 本地持久化的认证会话结构。 */
export interface AuthSession {
  accessToken: string
  clientId?: string
  expireIn?: number
  refreshExpireIn?: number
  refreshToken: string
  scope?: string
}

const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const CLIENT_ID_KEY = 'authClientId'
const EXPIRE_IN_KEY = 'authExpireIn'
const REFRESH_EXPIRE_IN_KEY = 'authRefreshExpireIn'
const SCOPE_KEY = 'authScope'

/** 清理本地认证存储。 */
export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(CLIENT_ID_KEY)
  localStorage.removeItem(EXPIRE_IN_KEY)
  localStorage.removeItem(REFRESH_EXPIRE_IN_KEY)
  localStorage.removeItem(SCOPE_KEY)
}

/** 读取 access token。 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
}

/** 生成受保护请求使用的 Bearer 头。 */
export function getAuthorizationHeader() {
  const token = getAccessToken()

  return token ? `Bearer ${token}` : null
}

/** 从本地恢复认证会话。 */
export function loadAuthSession(): AuthSession | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    clientId: localStorage.getItem(CLIENT_ID_KEY) ?? undefined,
    expireIn: readNumber(EXPIRE_IN_KEY),
    refreshExpireIn: readNumber(REFRESH_EXPIRE_IN_KEY),
    refreshToken,
    scope: localStorage.getItem(SCOPE_KEY) ?? undefined,
  }
}

/** 保存认证会话。 */
export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)

  setOptionalValue(CLIENT_ID_KEY, session.clientId)
  setOptionalValue(EXPIRE_IN_KEY, session.expireIn)
  setOptionalValue(REFRESH_EXPIRE_IN_KEY, session.refreshExpireIn)
  setOptionalValue(SCOPE_KEY, session.scope)
}

function readNumber(key: string) {
  const value = localStorage.getItem(key)

  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function setOptionalValue(key: string, value: number | string | undefined) {
  if (value === undefined) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, String(value))
}
