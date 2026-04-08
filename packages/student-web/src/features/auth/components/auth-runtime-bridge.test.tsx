/**
 * 文件说明：验证全局认证失败桥接对 401 / 403 的导航与会话处理。
 */
import { screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { emitAuthFailure } from '@/services/api/auth-failure';
import {
  useAuthSessionStore
} from '@/stores/auth-session-store';
import { renderWithApp } from '@/test/utils/render-app';
import { resetAppTestState, seedMockAuthSession } from '@/test/utils/session';

describe('AuthRuntimeBridge', () => {
  beforeEach(async () => {
    await resetAppTestState({ resetProfile: false });
  });

  it('clears the session and redirects to /login after a global 401', async () => {
    await seedMockAuthSession();

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

    renderWithApp(<RouterProvider router={router} />);

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
    const session = await seedMockAuthSession();

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

    renderWithApp(<RouterProvider router={router} />);

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
