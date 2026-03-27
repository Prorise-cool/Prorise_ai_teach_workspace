/**
 * 登录表单测试。
 * 验证 Story 1.1 当前联调壳层下的参数拼装和验证码校验边界。
 */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/api/auth', () => ({
  fetchCaptchaCode: vi.fn(),
  fetchTenantList: vi.fn(),
}))

import { LoginForm } from '@/components/auth/login-form'
import { fetchCaptchaCode, fetchTenantList } from '@/lib/api/auth'
import { renderWithProviders } from '@/test/test-utils'

const mockedFetchCaptchaCode = vi.mocked(fetchCaptchaCode)
const mockedFetchTenantList = vi.mocked(fetchTenantList)

describe('login form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchTenantList.mockResolvedValue({
      tenantEnabled: true,
      voList: [
        {
          companyName: '示例租户',
          domain: null,
          tenantId: '000000',
        },
      ],
    })
    mockedFetchCaptchaCode.mockResolvedValue({
      captchaEnabled: true,
      img: 'ZmFrZQ==',
      uuid: 'uuid-1',
    })
  })

  test('验证码开启时必须填写验证码', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <LoginForm busy={false} onLogin={vi.fn()} onSuccess={vi.fn()} onSwitchMode={vi.fn()} />,
    )

    await user.type(await screen.findByLabelText('用户名'), 'alice')
    await user.type(screen.getByLabelText('密码'), 'Password123')
    await user.click(screen.getByRole('button', { name: /登录并返回首页/i }))

    expect(await screen.findByText('请输入验证码。')).toBeInTheDocument()
  })

  test('提交时保留默认 tenantId 并携带 uuid', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <LoginForm busy={false} onLogin={onLogin} onSuccess={onSuccess} onSwitchMode={vi.fn()} />,
    )

    await user.type(await screen.findByLabelText('用户名'), 'alice')
    await user.type(screen.getByLabelText('密码'), 'Password123')
    await user.type(screen.getByLabelText('验证码'), '6')
    await user.click(screen.getByRole('button', { name: /登录并返回首页/i }))

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: '000000',
          username: 'alice',
          uuid: 'uuid-1',
        }),
      )
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
