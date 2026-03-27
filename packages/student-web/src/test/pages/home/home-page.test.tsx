/**
 * 首页联调壳层测试。
 * 验证当前页面明确标注为联调验证用途，并仍然可以打开认证对话框。
 */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/components/auth/auth-dialog', () => ({
  AuthDialog: ({ mode, open }: { mode: string; open: boolean }) =>
    open ? <div data-testid="auth-dialog">dialog:{mode}</div> : null,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'
import { HomePage } from '@/pages/home/home-page'
import { renderWithProviders } from '@/test/test-utils'

const mockedUseAuth = vi.mocked(useAuth)

describe('home page', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      busy: false,
      initialize: vi.fn(),
      initialized: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      register: vi.fn(),
      session: null,
      status: 'unauthenticated',
      userInfo: null,
    })
  })

  test('明确提示当前页面只是认证联调验证壳层', () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByText('认证联调验证壳层，非最终视觉页面')).toBeInTheDocument()
    expect(
      screen.getByText('当前首页仅用于认证联调验证，不是最终线框图对应的正式页面。'),
    ).toBeInTheDocument()
  })

  test('未登录时点击登录仍可打开认证对话框', async () => {
    const user = userEvent.setup()

    renderWithProviders(<HomePage />)

    await user.click(screen.getByRole('button', { name: /^登录$/ }))

    expect(screen.getByTestId('auth-dialog')).toHaveTextContent('dialog:login')
  })
})
