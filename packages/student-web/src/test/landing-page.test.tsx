/**
 * 文件说明：验证公开落地页的主题、语言切换与关键展示交互。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { appI18n } from '@/app/i18n';
import { AppShell } from '@/app/layouts/app-shell';
import { AppProvider } from '@/app/provider/app-provider';
import { LandingPage } from '@/features/home/landing-page';
import { resetAuthSessionStore } from '@/stores/auth-session-store';

/**
 * 构造公开落地页与受保护工作区的联动路由。
 *
 * @param initialEntries - 初始路由位置。
 * @returns 供测试使用的内存路由实例。
 */
function createLandingRouter(initialEntries: string[] = ['/landing']) {
  return createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            path: 'landing',
            element: <LandingPage />
          }
        ]
      }
    ],
    {
      initialEntries
    }
  );
}

describe('LandingPage', () => {
  beforeEach(async () => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = 'light';
    await appI18n.changeLanguage('zh-CN');
  });

  it('switches theme and locale on the public landing page', async () => {
    const router = createLandingRouter();
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    const heroImage = screen.getByRole('img', {
      name: '小麦落地页课堂展示图'
    });

    expect(heroImage).toHaveAttribute(
      'src',
      expect.stringContaining('/entry/hero-image-light.jpg')
    );

    await user.click(screen.getByRole('button', { name: '切到深色' }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    await waitFor(() => {
      expect(
        screen.getByRole('img', { name: '小麦落地页课堂展示图' })
      ).toHaveAttribute(
        'src',
        expect.stringContaining('/entry/hero-image-dark.jpg')
      );
    });

    await user.click(screen.getAllByRole('button', { name: 'EN' })[0]);

    expect(
      await screen.findByRole('link', { name: /Try XiaoMai/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '中' })[0]).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/landing');
    expect(router.state.location.search).toBe('');
  });

  it('keeps the landing page public while carousel, CTA path, and smooth section scrolling still work', async () => {
    const router = createLandingRouter();
    const user = userEvent.setup();
    const scrollIntoViewMock = vi.fn();

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock
    });

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.queryByRole('link', { name: '登录' })).not.toBeInTheDocument();

    const previousButton = screen.getByRole('button', { name: '上一页' });
    const nextButton = screen.getByRole('button', { name: '下一页' });

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(
      screen.getByRole('link', { name: '立即体验' })
    ).toHaveAttribute('href', '/');
    expect(
      screen.queryByLabelText('查看参考仓库')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '查看老师简介' })
    ).not.toBeInTheDocument();

    await user.click(nextButton);

    expect(previousButton).toBeEnabled();
    expect(router.state.location.pathname).toBe('/landing');

    await user.click(screen.getAllByRole('button', { name: '使用流程' })[0]);

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});
