/**
 * 文件说明：验证 Story 1.3 首页中的受保护探针与登出动作。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { HomePage } from '@/features/home/home-page';
import {
  createAuthConsistencyService,
  type AuthConsistencyService
} from '@/services/auth-consistency';
import { createMockAuthAdapter } from '@/services/api/adapters';
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

function createConsistencyServiceStub(
  overrides: Partial<AuthConsistencyService> = {}
): AuthConsistencyService {
  return {
    ...createAuthConsistencyService({
      request: vi.fn()
    } as never),
    ...overrides
  };
}

describe('HomePage', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders the protected probe result after a successful consistency check', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const consistencyService = createConsistencyServiceStub({
      getSessionProbe: vi.fn().mockResolvedValue({
        userId: '1',
        username: 'admin',
        roles: ['admin'],
        permissions: ['video:task:add', 'classroom:session:add'],
        onlineTtlSeconds: 7200,
        requestId: 'req_home_probe_001'
      })
    });
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <HomePage consistencyService={consistencyService} />
        }
      ],
      {
        initialEntries: ['/']
      }
    );
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.click(
      screen.getByRole('button', { name: '验证受保护访问' })
    );

    expect(await screen.findByText('req_home_probe_001')).toBeInTheDocument();
    expect(screen.getByText('7200')).toBeInTheDocument();
  });

  it('clears the local session and returns to /login after logout', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const logout = vi.fn().mockResolvedValue(undefined);
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <HomePage
              consistencyService={createConsistencyServiceStub()}
              service={createServiceStub({ logout })}
            />
          )
        },
        {
          path: '/login',
          element: <div>Login route</div>
        }
      ],
      {
        initialEntries: ['/']
      }
    );
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });

    expect(logout).toHaveBeenCalledWith(session.accessToken);
    expect(useAuthSessionStore.getState().session).toBeNull();
  });
});
