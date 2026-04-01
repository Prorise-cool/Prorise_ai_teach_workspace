import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router-dom';

import { LoginPage } from '@/features/auth/login-page';
import { useAuthStore } from '@/stores/auth-store';
import { createAuthSession } from '@/test/helpers/auth-fixtures';
import { renderRouteObjects } from '@/test/helpers/router';

function createRoutes(): RouteObject[] {
  return [
    {
      path: '/login',
      element: <LoginPage />
    },
    {
      path: '/video/input',
      element: <div>视频输入页</div>
    },
    {
      path: '/',
      element: <div>首页</div>
    }
  ];
}

describe('LoginPage', () => {
  it('supports switching between login and register on the same page', async () => {
    const user = userEvent.setup();

    renderRouteObjects(createRoutes(), {
      initialEntries: ['/login']
    });

    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(screen.getByLabelText('验证码')).toBeInTheDocument();
    expect(screen.getByLabelText('设置密码')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(screen.getByLabelText('手机号 / 邮箱 / 用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
  });

  it('redirects to returnTo after successful login', async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn(() => Promise.resolve(createAuthSession()));

    useAuthStore.setState({
      login: loginMock
    });

    const { router } = renderRouteObjects(createRoutes(), {
      initialEntries: ['/login?returnTo=%2Fvideo%2Finput']
    });

    await user.type(screen.getByLabelText('手机号 / 邮箱 / 用户名'), 'student_demo');
    await user.type(screen.getByLabelText('密码'), 'Passw0rd!');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/video/input');
    });
    expect(loginMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'student_demo',
        password: 'Passw0rd!',
        returnTo: '/video/input'
      })
    );
  });

  it('shows a form-level error when login fails', async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn(() =>
      Promise.reject(new Error('用户名或密码错误'))
    );

    useAuthStore.setState({
      login: loginMock
    });

    renderRouteObjects(createRoutes(), {
      initialEntries: ['/login']
    });

    await user.type(screen.getByLabelText('手机号 / 邮箱 / 用户名'), 'observer_demo');
    await user.type(screen.getByLabelText('密码'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '登录并继续' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码错误');
  });

  it('keeps keyboard navigation on the primary fields and submit action', async () => {
    const user = userEvent.setup();

    renderRouteObjects(createRoutes(), {
      initialEntries: ['/login']
    });

    await user.tab();
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: '登录' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: '注册' })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('手机号 / 邮箱 / 用户名')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('密码')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: '登录并继续' })).toHaveFocus();
  });
});
