/**
 * 认证表单辅助 Hook 测试。
 * 验证租户与验证码数据是否在挂载时加载，以及验证码刷新是否会更新最新状态。
 */
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/api/auth', () => ({
  fetchCaptchaCode: vi.fn(),
  fetchTenantList: vi.fn(),
}))

import { useAuthFormFeatures } from '@/components/auth/use-auth-form-features'
import { fetchCaptchaCode, fetchTenantList } from '@/lib/api/auth'

const mockedFetchCaptchaCode = vi.mocked(fetchCaptchaCode)
const mockedFetchTenantList = vi.mocked(fetchTenantList)

describe('useAuthFormFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('挂载时会同时加载租户列表和验证码', async () => {
    mockedFetchTenantList.mockResolvedValue({
      tenantEnabled: true,
      voList: [
        {
          companyName: '默认租户',
          domain: null,
          tenantId: '000000',
        },
      ],
    })
    mockedFetchCaptchaCode.mockResolvedValue({
      captchaEnabled: true,
      img: 'first-image',
      uuid: 'uuid-1',
    })

    const { result } = renderHook(() => useAuthFormFeatures())

    await waitFor(() => {
      expect(result.current.tenantEnabled).toBe(true)
      expect(result.current.tenants).toHaveLength(1)
      expect(result.current.captcha?.uuid).toBe('uuid-1')
    })
  })

  test('refreshCaptcha 会返回并落位最新验证码', async () => {
    mockedFetchTenantList.mockResolvedValue({
      tenantEnabled: false,
      voList: [],
    })
    mockedFetchCaptchaCode
      .mockResolvedValueOnce({
        captchaEnabled: true,
        img: 'first-image',
        uuid: 'uuid-1',
      })
      .mockResolvedValueOnce({
        captchaEnabled: true,
        img: 'second-image',
        uuid: 'uuid-2',
      })

    const { result } = renderHook(() => useAuthFormFeatures())

    await waitFor(() => {
      expect(result.current.captcha?.uuid).toBe('uuid-1')
    })

    let refreshedCaptcha:
      | {
          captchaEnabled: boolean
          img?: string
          uuid?: string
        }
      | undefined

    await act(async () => {
      refreshedCaptcha = await result.current.refreshCaptcha()
    })

    expect(refreshedCaptcha?.uuid).toBe('uuid-2')
    expect(result.current.captcha?.uuid).toBe('uuid-2')
  })
})
