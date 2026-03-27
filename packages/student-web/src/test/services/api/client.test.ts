/**
 * API client 测试。
 * 验证 Bearer token 注入与未授权清理语义是否被统一收口。
 */
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { clearAuthStorage } from '@/lib/storage/auth'
import { registerUnauthorizedHandler, request } from '@/services/api/client'

describe('api client', () => {
  beforeEach(() => {
    clearAuthStorage()
    registerUnauthorizedHandler(() => {})
    vi.restoreAllMocks()
  })

  test('在受保护请求中自动附带 Bearer token', async () => {
    localStorage.setItem('token', 'access-token')
    localStorage.setItem('refreshToken', 'refresh-token')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 200, data: { ok: true }, msg: '操作成功' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      }),
    )

    const data = await request<{ ok: boolean }>({
      method: 'GET',
      path: '/system/user/getInfo',
    })

    const requestArg = fetchSpy.mock.calls[0]?.[0]
    const headers =
      requestArg instanceof Request
        ? requestArg.headers
        : ((fetchSpy.mock.calls[0]?.[1]?.headers as Headers | undefined) ?? new Headers())

    expect(headers.get('Authorization')).toBe('Bearer access-token')
    expect(data).toEqual({ ok: true })
  })

  test('收到 401 语义时清理本地认证态并回调统一处理器', async () => {
    localStorage.setItem('token', 'expired-token')
    localStorage.setItem('refreshToken', 'expired-refresh-token')

    const handler = vi.fn()
    registerUnauthorizedHandler(handler)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 401, data: null, msg: '登录状态已过期，请重新登录' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      }),
    )

    await expect(
      request({
        method: 'GET',
        path: '/system/user/getInfo',
      }),
    ).rejects.toThrow('登录状态已过期，请重新登录')

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(handler).toHaveBeenCalledWith('登录状态已过期，请重新登录')
  })
})
