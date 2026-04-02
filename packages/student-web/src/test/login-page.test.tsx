/**
 * 文件说明：验证登录页登录注册链路与第三方登录回调页的关键交互。
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter
} from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { AppProvider } from '@/app/provider/app-provider';
import { LoginPage } from '@/features/auth/pages/login-page';
import { SocialCallbackPage } from '@/features/auth/pages/social-callback-page';
import { createMockAuthAdapter, createAuthError } from '@/services/api/adapters';
import {
  AUTH_RETURN_TO_KEY,
  AUTH_SOCIAL_RETURN_TO_STORAGE_KEY,
  createAuthService,
  type AuthService
} from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';
import { AUTH_DEFAULT_USER_TYPE } from '@/types/auth';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 创建带默认实现的认证服务桩，便于覆盖单个行为。
 *
 * @param overrides - 需要覆盖的服务方法。
 * @returns 可注入页面的认证服务桩。
 */
function createServiceStub(overrides: Partial<AuthService> = {}): AuthService {
  return {
    ...mockAuthService,
    ...overrides
  };
}

/**
 * 渲染认证路由，并允许注入自定义认证服务实现。
 *
 * @param options - 渲染选项。
 * @param options.initialEntries - 初始路由。
 * @param options.service - 可替换的认证服务。
 * @returns Testing Library 渲染结果和用户事件实例。
 */
function renderAuthRoute({
  initialEntries = ['/login'],
  service = mockAuthService
}: {
  initialEntries?: Array<string | { pathname: string; state?: unknown }>;
  service?: AuthService;
} = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <div>Home route</div>
      },
      {
        path: '/video/input',
        element: <div>Video input route</div>
      },
      {
        path: '/login',
        element: <LoginPage service={service} />
      },
      {
        path: '/login/social-callback',
        element: <SocialCallbackPage service={service} />
      }
    ],
    {
      initialEntries
    }
  );

  return {
    router,
    user: userEvent.setup(),
    ...render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    )
  };
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = 'light';
  });

  it('supports keyboard navigation on the login page', async () => {
    const { user } = renderAuthRoute();

    expect(
      screen.getByRole('heading', { name: '欢迎回来' })
    ).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: '切换亮暗色' })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('账号')).toHaveFocus();
  });

  it('offers a clear cancel-return action when a pending returnTo exists', async () => {
    const { user } = renderAuthRoute({
      initialEntries: [`/login?${AUTH_RETURN_TO_KEY}=/video/input`]
    });

    expect(screen.getByText('/video/input')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '取消回跳，返回首页' })
    );

    expect(await screen.findByText('Home route')).toBeInTheDocument();
  });

  it('updates auth copy when the locale changes', async () => {
    renderAuthRoute();

    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toBeInTheDocument();

    await act(async () => {
      await appI18n.changeLanguage('en-US');
    });

    expect(screen.getByRole('link', { name: 'Back home' })).toBeInTheDocument();
    expect(screen.getByLabelText('Account')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
  });

  it('logs in with admin credentials and redirects to the query returnTo target', async () => {
    const { user } = renderAuthRoute({
      initialEntries: [`/login?${AUTH_RETURN_TO_KEY}=/video/input`]
    });

    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'admin123{Enter}');

    expect(await screen.findByText('Video input route')).toBeInTheDocument();

    await waitFor(() => {
      expect(useAuthSessionStore.getState().session?.user.username).toBe('admin');
    });
  });

  it('shows a field-level message when credentials are invalid', async () => {
    const { user } = renderAuthRoute();

    await user.type(screen.getByLabelText('账号'), 'unknown_user');
    await user.type(screen.getByLabelText('密码'), 'bad-password');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(
      await screen.findByText('账号或密码不正确，请重试')
    ).toBeInTheDocument();
  });

  it('shows a form-level message for non-credential 401 responses', async () => {
    const service = createServiceStub({
      login: vi.fn().mockRejectedValue(
        createAuthError(401, 401, '当前会话已失效，请重新登录')
      )
    });
    const { user } = renderAuthRoute({ service });

    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'admin123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(
      await screen.findByText('当前会话已失效，请重新登录')
    ).toBeInTheDocument();
    expect(screen.queryByText('账号或密码不正确，请重试')).toBeNull();
  });

  it('redirects away from the login page when a session already exists', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const { router } = renderAuthRoute();

    expect((await screen.findAllByText('你已登录')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('正在返回首页，避免你重复进入登录页。').length
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });

    expect(router.state.location.pathname).not.toBe('/login');
    expect(screen.queryByRole('heading', { name: '欢迎回来' })).toBeNull();
  });

  it('hides the register tab when backend registration is disabled', async () => {
    const getRegisterEnabled = vi.fn().mockResolvedValue(false);

    renderAuthRoute({
      service: createServiceStub({ getRegisterEnabled })
    });

    await waitFor(() => {
      expect(getRegisterEnabled).toHaveBeenCalledWith('000000');
    });

    expect(
      screen.queryByRole('button', { name: '注册' })
    ).not.toBeInTheDocument();
  });

  it('shows the register tab when backend registration is enabled', async () => {
    const { user } = renderAuthRoute({
      service: createServiceStub({
        getRegisterEnabled: vi.fn().mockResolvedValue(true)
      })
    });

    await user.click(await screen.findByRole('button', { name: '注册' }));

    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
  });

  it('returns to the login view and shows a success message after registration', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const { user } = renderAuthRoute({
      service: createServiceStub({
        getRegisterEnabled: vi.fn().mockResolvedValue(true),
        register
      })
    });

    await user.click(await screen.findByRole('button', { name: '注册' }));
    await user.type(screen.getByLabelText('用户名'), 'new_student');
    await user.type(screen.getByLabelText('密码'), 'Passw0rd!');
    await user.type(screen.getByLabelText('确认密码'), 'Passw0rd!');
    await user.click(screen.getByRole('checkbox'));
    const registerButtons = screen.getAllByRole('button', { name: '注册' });
    const registerSubmitButton = registerButtons[registerButtons.length - 1];

    await user.click(
      registerSubmitButton
    );

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'new_student',
          password: 'Passw0rd!',
          confirmPassword: 'Passw0rd!',
          userType: AUTH_DEFAULT_USER_TYPE
        })
      );
    });

    expect(
      await screen.findByText('注册成功，请使用新账号登录')
    ).toBeInTheDocument();
    expect(
      screen.getByText('已切回登录，并帮你回填刚注册的账号。')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toHaveValue('new_student');
    expect(screen.getByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
  });

  it('shows and validates captcha when backend captcha is enabled', async () => {
    const { user } = renderAuthRoute({
      service: createServiceStub({
        getCaptcha: vi.fn().mockResolvedValue({
          captchaEnabled: true,
          uuid: 'mock-captcha-uuid',
          imageBase64: 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
        })
      })
    });

    await user.type(screen.getByLabelText('账号'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'admin123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByLabelText('验证码')).toBeInTheDocument();
    expect(await screen.findByText('请输入验证码')).toBeInTheDocument();
  });

  it('completes the social callback flow and restores the pending returnTo', async () => {
    window.sessionStorage.setItem(
      AUTH_SOCIAL_RETURN_TO_STORAGE_KEY,
      '/video/input'
    );

    renderAuthRoute({
      initialEntries: [
        '/login/social-callback?source=github&code=mock-github-code&state=eyJ0ZW5hbnRJZCI6IjAwMDAwMCIsImRvbWFpbiI6ImxvY2FsaG9zdDo0MTczIn0='
      ]
    });

    expect(await screen.findByText('Video input route')).toBeInTheDocument();

    await waitFor(() => {
      expect(useAuthSessionStore.getState().session?.user.username).toBe(
        'social_student'
      );
    });
  });
});
