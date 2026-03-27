/**
 * 认证接口契约层。
 * 统一封装 student-web 访问 RuoYi 认证接口时使用的请求与响应类型。
 */
import { request } from '@/services/api/client'

export interface AuthTenant {
  companyName: string
  domain: string | null
  tenantId: string
}

export interface AuthTenantList {
  tenantEnabled: boolean
  voList: AuthTenant[]
}

export interface CaptchaInfo {
  captchaEnabled: boolean
  img?: string
  uuid?: string
}

export interface AuthTokenResponse {
  access_token: string
  client_id?: string
  expire_in?: number
  openid?: string
  refresh_expire_in?: number
  refresh_token: string
  scope?: string
}

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

export interface CurrentUserInfo {
  permissions: string[]
  roles: string[]
  user?: AuthenticatedUser
}

export interface LoginPayload {
  clientId: string
  code?: string
  grantType: 'password'
  password: string
  tenantId: string
  username: string
  uuid?: string
}

export interface RegisterPayload extends LoginPayload {
  confirmPassword: string
  userType: 'sys_user'
}

export async function fetchCaptchaCode() {
  return request<CaptchaInfo>({
    method: 'GET',
    path: '/auth/code',
    requiresAuth: false,
  })
}

export async function fetchCurrentUserInfo() {
  return request<CurrentUserInfo>({
    method: 'GET',
    path: '/system/user/getInfo',
  })
}

export async function fetchLogin(payload: LoginPayload) {
  return request<AuthTokenResponse>({
    encrypted: true,
    method: 'POST',
    path: '/auth/login',
    requiresAuth: false,
    body: payload,
  })
}

export async function fetchLogout() {
  return request<void>({
    method: 'POST',
    path: '/auth/logout',
  })
}

export async function fetchRegister(payload: RegisterPayload) {
  return request<void>({
    encrypted: true,
    method: 'POST',
    path: '/auth/register',
    requiresAuth: false,
    body: payload,
  })
}

export async function fetchTenantList() {
  return request<AuthTenantList>({
    method: 'GET',
    path: '/auth/tenant/list',
    requiresAuth: false,
  })
}
