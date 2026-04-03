/**
 * 文件说明：验证受保护路由在未登录时回到登录页，并保留回跳地址。
 */
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

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
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('redirects unauthenticated users to /login', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <RequireAuthRoute service={mockAuthService} />,
          children: [
            {
              index: true,
              element: <div>Protected home</div>
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
        initialEntries: ['/']
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

    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();
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
              index: true,
              element: <div>Protected home</div>
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
        initialEntries: ['/']
      }
    );

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(await screen.findByText('Protected home')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
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
              index: true,
              element: <div>Protected home</div>
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
        initialEntries: ['/']
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
    expect(screen.queryByText('Protected home')).not.toBeInTheDocument();
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
              index: true,
              element: <div>Protected home</div>
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
        initialEntries: ['/']
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
