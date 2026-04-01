import { screen } from '@testing-library/react';

import { HomePage } from '@/features/home/home-page';
import { useAuthStore } from '@/stores/auth-store';
import { createAuthSession, createAuthUser } from '@/test/helpers/auth-fixtures';
import { renderWithMemoryRouter } from '@/test/helpers/router';

describe('HomePage', () => {
  it('sends guests to login with preserved intent when clicking entry CTAs', () => {
    renderWithMemoryRouter(<HomePage />);

    expect(
      screen.getByRole('link', { name: '进入课堂输入' })
    ).toHaveAttribute('href', '/login?returnTo=%2Fclassroom%2Finput');
    expect(
      screen.getByRole('link', { name: '进入视频输入' })
    ).toHaveAttribute('href', '/login?returnTo=%2Fvideo%2Finput');
  });

  it('links authenticated users directly to the protected entry routes', () => {
    useAuthStore.setState({
      session: createAuthSession()
    });

    renderWithMemoryRouter(<HomePage />);

    expect(
      screen.getByRole('link', { name: '进入课堂输入' })
    ).toHaveAttribute('href', '/classroom/input');
    expect(
      screen.getByRole('link', { name: '进入视频输入' })
    ).toHaveAttribute('href', '/video/input');
  });

  it('falls back gracefully when recommendation context is unavailable', () => {
    renderWithMemoryRouter(<HomePage />, {
      route: '/?recommend=none'
    });

    expect(
      screen.getByText('暂未拿到推荐上下文')
    ).toBeInTheDocument();
    expect(
      screen.getByText('即使推荐逻辑暂时不可用，你仍可直接选择任一入口继续。')
    ).toBeInTheDocument();
  });

  it('does not expose entry actions as enabled for an admin without learning permissions', () => {
    useAuthStore.setState({
      session: createAuthSession({
        user: createAuthUser({
          roles: [{ key: 'admin', name: '管理员' }],
          permissions: []
        })
      })
    });

    renderWithMemoryRouter(<HomePage />);

    expect(
      screen.getByRole('button', { name: '当前账号暂无课堂入口权限' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '当前账号暂无视频入口权限' })
    ).toBeDisabled();
    expect(
      screen.getByText('管理员账号仍以 RuoYi 权限为事实来源；学生端只展示学习相关提示，不注入管理后台导航。')
    ).toBeInTheDocument();
  });
});
