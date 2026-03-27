/**
 * 认证接口契约层。
 * 统一封装 student-web 访问 RuoYi 认证接口时使用的请求与响应类型。
 */
import { request } from '@/services/api/client'

/** 租户选项。 */
export interface AuthTenant {
  companyName: string
  domain: string | null
  tenantId: string
}

/** 租户列表响应。 */
export interface AuthTenantList {
  tenantEnabled: boolean
  voList: AuthTenant[]
}

/** 验证码信息。 */
export interface CaptchaInfo {
  captchaEnabled: boolean
  img?: string
  uuid?: string
}

/** 登录成功后返回的 Token 信息。 */
export interface AuthTokenResponse {
  access_token: string
  client_id?: string
  expire_in?: number
  openid?: string
  refresh_expire_in?: number
  refresh_token: string
  scope?: string
}

/** 当前认证用户。 */
export interface AuthenticatedUser {
  avatar?: string
  nickName?: string
  roles?: Array<{
    roleId?: number | string
    roleKey?: string
    roleName?: string
  }>
  userId?: number | string
  userName?: string
  [key: string]: unknown
}

/** `/system/user/getInfo` 返回的用户上下文。 */
export interface CurrentUserInfo {
  permissions: string[]
  roles: string[]
  user?: AuthenticatedUser
}

/** 登录载荷。 */
export interface LoginPayload {
  clientId: string
  code?: string
  grantType: 'password'
  password: string
  tenantId: string
  username: string
  uuid?: string
}

/** 注册载荷。 */
export interface RegisterPayload extends LoginPayload {
  confirmPassword: string
  userType: 'sys_user'
}

/** 获取验证码配置。 */
export async function fetchCaptchaCode() {
  return request<CaptchaInfo>({
    method: 'GET',
    path: '/auth/code',
    requiresAuth: false,
  })
}

/** 拉取当前登录用户信息。 */
export async function fetchCurrentUserInfo() {
  return request<CurrentUserInfo>({
    method: 'GET',
    path: '/system/user/getInfo',
  })
}

/** 调用 RuoYi 登录接口。 */
export async function fetchLogin(payload: LoginPayload) {
  return request<AuthTokenResponse>({
    encrypted: true,
    method: 'POST',
    path: '/auth/login',
    repeatSubmit: false,
    requiresAuth: false,
    body: payload,
  })
}

/** 调用 RuoYi 登出接口。 */
export async function fetchLogout() {
  return request<void>({
    method: 'POST',
    path: '/auth/logout',
  })
}

/** 调用 RuoYi 注册接口。 */
export async function fetchRegister(payload: RegisterPayload) {
  return request<void>({
    encrypted: true,
    method: 'POST',
    path: '/auth/register',
    repeatSubmit: false,
    requiresAuth: false,
    body: payload,
  })
}

/** 获取租户开关与租户列表。 */
export async function fetchTenantList() {
  return request<AuthTenantList>({
    method: 'GET',
    path: '/auth/tenant/list',
    requiresAuth: false,
  })
}
