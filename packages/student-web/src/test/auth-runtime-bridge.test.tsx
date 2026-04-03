/**
 * 文件说明：验证全局认证失败桥接对 401 / 403 的导航与会话处理。
 */
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { AppShell } from '@/app/layouts/app-shell';
import { emitAuthFailure } from '@/services/api/auth-failure';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

describe('AuthRuntimeBridge', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('clears the session and redirects to /login after a global 401', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [
            {
              index: true,
              element: <div>Protected home</div>
            },
            {
              path: 'login',
              element: <div>Login route</div>
            },
            {
              path: 'forbidden',
              element: <div>Forbidden route</div>
            }
          ]
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

    emitAuthFailure({
      status: 401,
      message: '当前会话已失效，请重新登录',
      requestUrl: '/api/v1/contracts/session-probe',
      responseCode: '401',
      occurredAt: Date.now()
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });

    expect(useAuthSessionStore.getState().session).toBeNull();
    expect(await screen.findByText('Login route')).toBeInTheDocument();
  });

  it('keeps the session and redirects to /forbidden after a global 403', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [
            {
              index: true,
              element: <div>Protected home</div>
            },
            {
              path: 'login',
              element: <div>Login route</div>
            },
            {
              path: 'forbidden',
              element: <div>Forbidden route</div>
            }
          ]
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

    emitAuthFailure({
      status: 403,
      message: '当前账号暂无访问权限',
      requestUrl: '/api/v1/contracts/permission-probe',
      responseCode: '403',
      occurredAt: Date.now()
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/forbidden');
    });

    expect(useAuthSessionStore.getState().session?.accessToken).toBe(
      session.accessToken
    );
    expect(await screen.findByText('Forbidden route')).toBeInTheDocument();
  });
});
