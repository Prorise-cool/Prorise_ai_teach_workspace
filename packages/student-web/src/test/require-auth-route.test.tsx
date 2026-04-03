/**
 * 文件说明：验证受保护路由在 Story 1.4 入口链路中的回跳与鉴权守卫。
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import { RequireAuthRoute } from '@/features/auth/components/require-auth-route';
import { ForbiddenPage } from '@/features/auth/pages/forbidden-page';
import { LoginPage } from '@/features/auth/pages/login-page';
import { createAuthError, createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService, type AuthService } from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

function createServiceStub(overrides: Partial<AuthService> = {}): AuthService {
  return {
    ...mockAuthService,
    ...overrides
  };
}

describe('RequireAuthRoute', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('redirects unauthenticated users to /login and preserves the original classroom target', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <RequireAuthRoute service={mockAuthService} />,
          children: [
            {
              path: 'classroom/input',
              element: <div>Protected classroom input</div>
            }
          ]
        },
        {
          path: '/login',
          element: <LoginPage service={mockAuthService} />
        },
        {
          path: '/forbidden',
          element: <ForbiddenPage />
        }
      ],
      {
        initialEntries: ['/classroom/input?mode=quick']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(await screen.findByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });

    expect(router.state.location.search).toBe(
      '?returnTo=%2Fclassroom%2Finput%3Fmode%3Dquick'
    );
    expect(
      screen.queryByText('Protected classroom input')
    ).not.toBeInTheDocument();
  });

  it('renders protected content when a session already exists', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <RequireAuthRoute service={mockAuthService} />,
          children: [
            {
              path: 'classroom/input',
              element: <div>Protected classroom input</div>
            }
          ]
        },
        {
          path: '/login',
          element: <LoginPage service={mockAuthService} />
        },
        {
          path: '/forbidden',
          element: <ForbiddenPage />
        }
      ],
      {
        initialEntries: ['/classroom/input']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(
      await screen.findByText('Protected classroom input')
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/classroom/input');
  });

  it('uses the top loading bar instead of a centered loading card while validating sessions', async () => {
    vi.useFakeTimers();

    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    let resolveCurrentUser:
      | ((value: typeof session.user) => void)
      | undefined;
    const pendingCurrentUser = new Promise<typeof session.user>(resolve => {
      resolveCurrentUser = resolve;
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RequireAuthRoute
              service={createServiceStub({
                getCurrentUser: vi.fn().mockReturnValue(pendingCurrentUser)
              })}
            />
          ),
          children: [
            {
              path: 'classroom/input',
              element: <div>Protected classroom input</div>
            }
          ]
        },
        {
          path: '/login',
          element: <LoginPage service={mockAuthService} />
        },
        {
          path: '/forbidden',
          element: <ForbiddenPage />
        }
      ],
      {
        initialEntries: ['/classroom/input']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.queryByText('正在校验会话')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(
      screen.getByRole('progressbar', { name: '全局加载中' })
    ).toBeInTheDocument();

    vi.useRealTimers();

    if (resolveCurrentUser) {
      resolveCurrentUser(session.user);
    }

    await waitFor(() => {
      expect(screen.getByText('Protected classroom input')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('progressbar', { name: '全局加载中' })
      ).not.toBeInTheDocument();
    });
  });

  it('redirects expired persisted sessions back to /login', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RequireAuthRoute
              service={createServiceStub({
                getCurrentUser: vi
                  .fn()
                  .mockRejectedValue(
                    createAuthError(401, 401, '当前会话已失效，请重新登录')
                  )
              })}
            />
          ),
          children: [
            {
              path: 'classroom/input',
              element: <div>Protected classroom input</div>
            }
          ]
        },
        {
          path: '/login',
          element: <LoginPage service={mockAuthService} />
        },
        {
          path: '/forbidden',
          element: <ForbiddenPage />
        }
      ],
      {
        initialEntries: ['/classroom/input']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });

    expect(useAuthSessionStore.getState().session).toBeNull();
    expect(router.state.location.search).toBe(
      '?returnTo=%2Fclassroom%2Finput'
    );
    expect(
      screen.queryByText('Protected classroom input')
    ).not.toBeInTheDocument();
  });

  it('routes authenticated but forbidden sessions to /forbidden', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RequireAuthRoute
              service={createServiceStub({
                getCurrentUser: vi
                  .fn()
                  .mockRejectedValue(
                    createAuthError(403, 403, '当前账号暂无小麦学生端访问权限')
                  )
              })}
            />
          ),
          children: [
            {
              path: 'classroom/input',
              element: <div>Protected classroom input</div>
            }
          ]
        },
        {
          path: '/login',
          element: <LoginPage service={mockAuthService} />
        },
        {
          path: '/forbidden',
          element: <ForbiddenPage />
        }
      ],
      {
        initialEntries: ['/classroom/input']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/forbidden');
    });

    expect(
      (await screen.findAllByText('当前账号暂无小麦学生端访问权限')).length
    ).toBeGreaterThan(0);
    expect(useAuthSessionStore.getState().session?.accessToken).toBe(
      session.accessToken
    );
  });
});
