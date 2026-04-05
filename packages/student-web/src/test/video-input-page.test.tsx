/**
 * 文件说明：验证视频输入页正确渲染共享组件、视频专属输入卡片与社区瀑布流。
 */
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { VideoInputPage } from '@/features/video/pages/video-input-page';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';
import { createAuthService } from '@/services/auth';
import { createMockAuthAdapter } from '@/services/api/adapters';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 构造视频输入页路由。
 *
 * @returns 内存路由实例。
 */
function createVideoRouter() {
  return createMemoryRouter(
    [
      {
        path: '/video/input',
        element: <VideoInputPage />
      }
    ],
    {
      initialEntries: ['/video/input']
    }
  );
}

describe('VideoInputPage', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders the header with badge and gradient title', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createVideoRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.getByText('Video Engine')).toBeInTheDocument();
    expect(screen.getByText(/5分钟生成动画讲解/)).toBeInTheDocument();
  });

  it('renders the submit button and suggestion pills', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createVideoRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(
      screen.getByRole('button', { name: /生成视频/ })
    ).toBeInTheDocument();
    expect(screen.getByText('证明洛必达法则')).toBeInTheDocument();
  });

  it('renders three guide cards', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createVideoRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.getByText('没找到合适讲解？')).toBeInTheDocument();
    expect(screen.getByText('登录后看更多')).toBeInTheDocument();
    expect(screen.getByText('网络不稳也能继续')).toBeInTheDocument();
  });

  it('renders the community feed with at least 6 cards', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createVideoRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.getByText('热门题目讲解视频')).toBeInTheDocument();
    expect(screen.getByText('洛必达法则的完整推导')).toBeInTheDocument();

    const feedCards = screen.getAllByRole('article');
    expect(feedCards.length).toBeGreaterThanOrEqual(6);
  });

  it('does not render backend-only fields in community cards', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createVideoRouter();

    const { container } = render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(container.textContent).not.toContain('status');
    expect(container.textContent).not.toContain('tenant_id');
  });
});
