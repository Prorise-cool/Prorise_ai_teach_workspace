/**
 * 文件说明：验证受保护路由在未登录时回到登录页，并保留回跳地址。
 */
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { RequireAuthRoute } from '@/features/auth/components/require-auth-route';
import { LoginPage } from '@/features/auth/pages/login-page';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

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
          element: <RequireAuthRoute />,
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
          element: <RequireAuthRoute />,
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
});
