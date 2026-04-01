import { screen, waitFor } from '@testing-library/react';

import { appRoutes } from '@/app/routes';
import { useAuthStore } from '@/stores/auth-store';
import { createAuthSession, createAuthUser } from '@/test/helpers/auth-fixtures';
import { renderRouteObjects } from '@/test/helpers/router';

describe('Epic 1 access control', () => {
  it('redirects unauthenticated users to login and preserves returnTo', async () => {
    const { router } = renderRouteObjects(appRoutes, {
      initialEntries: ['/video/input']
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(router.state.location.search).toBe('?returnTo=%2Fvideo%2Finput');
  });

  it('routes logged-in but unauthorized users to the 403 page', async () => {
    useAuthStore.getState().setSession(
      createAuthSession({
        user: createAuthUser({
          roles: [{ key: 'admin', name: '管理员' }],
          permissions: []
        })
      })
    );

    const { router } = renderRouteObjects(appRoutes, {
      initialEntries: ['/video/input']
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/403');
    });
    expect(
      screen.getByRole('heading', {
        name: '当前账号暂时不能进入这个入口'
      })
    ).toBeInTheDocument();
  });
});
