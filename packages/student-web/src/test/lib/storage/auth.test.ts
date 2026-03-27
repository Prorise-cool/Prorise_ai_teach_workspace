/**
 * 认证存储测试。
 * 验证 access token、refresh token 与附属字段的持久化和清理行为。
 */
import { beforeEach, describe, expect, test } from 'vitest'

import {
  clearAuthStorage,
  getAuthorizationHeader,
  loadAuthSession,
  saveAuthSession,
} from '@/lib/storage/auth'

describe('auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('保存后可以按统一格式恢复认证会话', () => {
    saveAuthSession({
      accessToken: 'access-token',
      clientId: 'client-id',
      expireIn: 7200,
      refreshExpireIn: 86400,
      refreshToken: 'refresh-token',
      scope: 'all',
    })

    expect(loadAuthSession()).toEqual({
      accessToken: 'access-token',
      clientId: 'client-id',
      expireIn: 7200,
      refreshExpireIn: 86400,
      refreshToken: 'refresh-token',
      scope: 'all',
    })
    expect(getAuthorizationHeader()).toBe('Bearer access-token')
  })

  test('清理后不再返回任何认证态', () => {
    saveAuthSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    clearAuthStorage()

    expect(loadAuthSession()).toBeNull()
    expect(getAuthorizationHeader()).toBeNull()
  })
})
