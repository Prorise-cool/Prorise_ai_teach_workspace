/**
 * 注册表单测试。
 * 验证 Story 1.1 当前联调壳层下的确认密码校验与注册回流边界。
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

import { RegisterForm } from '@/components/auth/register-form'
import { fetchCaptchaCode, fetchTenantList } from '@/lib/api/auth'
import { renderWithProviders } from '@/test/test-utils'

const mockedFetchCaptchaCode = vi.mocked(fetchCaptchaCode)
const mockedFetchTenantList = vi.mocked(fetchTenantList)

describe('register form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchTenantList.mockResolvedValue({
      tenantEnabled: false,
      voList: [],
    })
    mockedFetchCaptchaCode.mockResolvedValue({
      captchaEnabled: true,
      img: 'ZmFrZQ==',
      uuid: 'uuid-2',
    })
  })

  test('确认密码不一致时阻止提交', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <RegisterForm
        busy={false}
        onRegister={vi.fn()}
        onRegistered={vi.fn()}
        onSwitchMode={vi.fn()}
      />,
    )

    await user.type(await screen.findByLabelText('用户名'), 'bob')
    await user.type(screen.getByLabelText('密码'), 'Password123')
    await user.type(screen.getByLabelText('确认密码'), 'Password456')
    await user.type(screen.getByLabelText('验证码'), '8')
    await user.click(screen.getByRole('button', { name: /注册并返回登录/i }))

    expect(await screen.findByText('两次输入的密码不一致。')).toBeInTheDocument()
  })

  test('注册成功后切回登录态', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined)
    const onRegistered = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <RegisterForm
        busy={false}
        onRegister={onRegister}
        onRegistered={onRegistered}
        onSwitchMode={vi.fn()}
      />,
    )

    await user.type(await screen.findByLabelText('用户名'), 'bob')
    await user.type(screen.getByLabelText('密码'), 'Password123')
    await user.type(screen.getByLabelText('确认密码'), 'Password123')
    await user.type(screen.getByLabelText('验证码'), '8')
    await user.click(screen.getByRole('button', { name: /注册并返回登录/i }))

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: '000000',
          userType: 'sys_user',
          uuid: 'uuid-2',
        }),
      )
    })
    expect(onRegistered).toHaveBeenCalledTimes(1)
  })
})
