import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsPage } from '@/features/profile/pages/settings-page';
import { resetAuthSessionStore, useAuthSessionStore } from '@/stores/auth-session-store';
import { renderRouterWithApp } from '@/test/utils/render-app';

const TEST_SESSION = {
  accessToken: 'mock-access-token',
  refreshToken: null,
  expiresIn: 3600,
  refreshExpiresIn: null,
  clientId: null,
  openId: null,
  scopes: [],
  user: {
    id: '10001',
    username: 'student',
    nickname: '小麦同学',
    avatarUrl: null,
    roles: [],
    permissions: [],
  },
};

describe('SettingsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
    useAuthSessionStore.getState().setSession(TEST_SESSION);

    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/api/user/profile')) {
        return new Response(JSON.stringify({ code: 200, msg: 'ok', data: null }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (url.includes('/system/user/profile/updatePwd')) {
        return new Response(JSON.stringify({ code: 200, msg: 'ok', data: null }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return new Response(JSON.stringify({ code: 200, msg: 'ok', data: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  });

  it('opens the phone binding dialog and persists updated phone value', async () => {
    const user = userEvent.setup();
    renderRouterWithApp(
      [
        { path: '/settings', element: <SettingsPage /> },
        { path: '/login', element: <div>Login route</div> },
      ],
      { initialEntries: ['/settings'] },
    );

    await user.click(screen.getByRole('button', { name: '更换手机号' }));
    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('请输入手机号'));
    await user.type(screen.getByPlaceholderText('请输入手机号'), '13912345678');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(window.localStorage.getItem('xiaomai-user-phone')).toBe('13912345678');
    await waitFor(() => {
      expect(screen.getByText(/139\s\*{4}\s5678/)).toBeInTheDocument();
    });
  });

  it('opens the password dialog and persists an updated timestamp on success', async () => {
    const user = userEvent.setup();
    renderRouterWithApp(
      [
        { path: '/settings', element: <SettingsPage /> },
        { path: '/login', element: <div>Login route</div> },
      ],
      { initialEntries: ['/settings'] },
    );

    await user.click(screen.getByRole('button', { name: '修改密码' }));
    expect(screen.getByPlaceholderText('请输入旧密码')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('请输入旧密码'), 'old-pass');
    await user.type(screen.getByPlaceholderText('请输入新密码'), 'NewPassw0rd!');
    await user.type(screen.getByPlaceholderText('再次输入新密码'), 'NewPassw0rd!');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('xiaomai-password-updated-at')).toMatch(
        /\d{4}-\d{2}-\d{2}T/,
      );
    });
  });

  it('opens the sessions dialog and can logout from within it', async () => {
    const user = userEvent.setup();
    const { router } = renderRouterWithApp(
      [
        { path: '/settings', element: <SettingsPage /> },
        { path: '/login', element: <div>Login route</div> },
      ],
      { initialEntries: ['/settings'] },
    );

    await user.click(screen.getByRole('button', { name: '查看登录设备' }));
    expect(screen.getByRole('button', { name: '退出当前会话' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '退出当前会话' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(useAuthSessionStore.getState().session).toBeNull();
    });
  });
});
