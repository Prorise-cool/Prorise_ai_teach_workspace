/**
 * 文件说明：验证 Story 1.4 公开首页的主 CTA、公开导航与未登录回跳行为。
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type RouteObject } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { RequireAuthRoute } from '@/features/auth/components/require-auth-route';
import { LoginPage } from '@/features/auth/pages/login-page';
import { HomePage } from '@/features/home/pages/home-page';
import { LandingPage } from '@/features/home/pages/landing-page';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import { renderRouterWithApp } from '@/test/utils/render-app';
import { resetAppTestState } from '@/test/utils/session';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 构造 Story 1.4 的最小路由树，用于验证公开首页与入口跳转链路。
 *
 * @param initialEntries - 初始路由位置。
 * @returns 供测试驱动的内存路由实例。
 */
function createEntryRouter(initialEntries: string[] = ['/']) {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: <AppShell />,
      children: [
        {
          index: true,
          element: <HomePage />
        },
        {
          path: 'landing',
          element: <LandingPage />
        },
        {
          element: <RequireAuthRoute service={mockAuthService} />,
          children: [
            {
              path: 'classroom/input',
              element: <div>Classroom Input</div>
            },
            {
              path: 'video/input',
              element: <div>Video Input</div>
            }
          ]
        },
        {
          path: 'login',
          element: <LoginPage service={mockAuthService} />
        }
      ]
    }
  ];

  return renderRouterWithApp(routes, {
    initialEntries
  }).router;
}

describe('HomePage', () => {
  beforeEach(async () => {
    await resetAppTestState({ resetProfile: false });
  });

  it('renders the public hero CTA and removes the old auth-consistency console copy', () => {
    createEntryRouter();

    expect(screen.getByText('XMAI')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /VIRTUAL\s*CLASSROOM/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Start Learning')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'EN' })[0]).toBeInTheDocument();
    expect(
      screen.queryByText('登录态与受保护访问已经接到真实校验链路')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '验证受保护访问' })
    ).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login with returnTo after the hero CTA is clicked', async () => {
    const router = createEntryRouter();
    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: /Start Learning/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });

    expect(router.state.location.search).toBe(
      '?returnTo=%2Fclassroom%2Finput'
    );
    expect(
      await screen.findByRole('heading', { name: '欢迎回来' })
    ).toBeInTheDocument();
  });

  it('opens the public landing page when users choose a top-nav showcase link', async () => {
    const router = createEntryRouter();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('link', { name: '产品亮点' })[0]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/landing');
      expect(router.state.location.hash).toBe('#features');
    });

    expect(
      await screen.findByText('真正体现产品差异的关键能力')
    ).toBeInTheDocument();
  });

  it('switches locale from the home top navigation', async () => {
    const router = createEntryRouter();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('button', { name: 'EN' })[0]);

    expect((await screen.findAllByText('About')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '中' })[0]).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.search).toBe('');
  });
});
