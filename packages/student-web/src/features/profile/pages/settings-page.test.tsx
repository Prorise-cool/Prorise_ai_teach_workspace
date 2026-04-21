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

  it('opens the phone binding dialog and sends phonenumber to the system profile endpoint', async () => {
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

    // 手机号改由 RuoYi /system/user/profile PUT 承接，前端只本地缓存展示值。
    await waitFor(() => {
      expect(screen.getByText(/139\s\*{4}\s5678/)).toBeInTheDocument();
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    const phoneCall = fetchMock.mock.calls.find(([request]) => {
      const url = typeof request === 'string' ? request : (request as Request).url;
      return url.includes('/system/user/profile') && !url.includes('updatePwd');
    });
    expect(phoneCall).toBeDefined();
  });

  it('opens the password dialog and calls the RuoYi updatePwd endpoint on success', async () => {
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

    // 密码更新走 /system/user/profile/updatePwd，成功后 dialog 关闭。
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('请输入旧密码')).not.toBeInTheDocument();
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    const updatePwdCall = fetchMock.mock.calls.find(([request]) => {
      const url = typeof request === 'string' ? request : (request as Request).url;
      return url.includes('/system/user/profile/updatePwd');
    });
    expect(updatePwdCall).toBeDefined();
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
