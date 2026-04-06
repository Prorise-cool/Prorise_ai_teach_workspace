/**
 * 文件说明：验证视频输入页正确渲染共享组件、视频专属输入卡片与社区瀑布流。
 * Story 3.2 新增：表单校验、提交态、mock 创建成功跳转、错误态展示。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { VideoInputPage } from '@/features/video/pages/video-input-page';
import { VideoGeneratingPlaceholder } from '@/features/video/pages/video-generating-placeholder';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';
import { createAuthService } from '@/services/auth';
import { createMockAuthAdapter } from '@/services/api/adapters';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 构造视频输入页路由（含 generating 占位路由）。
 *
 * @returns 内存路由实例。
 */
function createVideoRouter() {
  return createMemoryRouter(
    [
      {
        path: '/video/input',
        element: <VideoInputPage />
      },
      {
        path: '/video/:id/generating',
        element: <VideoGeneratingPlaceholder />
      }
    ],
    {
      initialEntries: ['/video/input']
    }
  );
}

/**
 * 设置已登录状态并渲染视频输入页。
 *
 * @returns render 结果和 router 实例。
 */
async function renderVideoInputPageWithAuth() {
  const session = await mockAuthService.login({
    username: 'admin',
    password: 'admin123'
  });

  useAuthSessionStore.getState().setSession(session);
  const router = createVideoRouter();

  const result = render(
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );

  return { ...result, router };
}

describe('VideoInputPage', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders the header with badge and gradient title', async () => {
    await renderVideoInputPageWithAuth();

    expect(screen.getByText('Video Engine')).toBeInTheDocument();
    expect(screen.getByText(/5分钟生成动画讲解/)).toBeInTheDocument();
  });

  it('renders the submit button and suggestion pills', async () => {
    await renderVideoInputPageWithAuth();

    expect(
      screen.getByRole('button', { name: /生成视频/ })
    ).toBeInTheDocument();
    expect(screen.getByText('证明洛必达法则')).toBeInTheDocument();
  });

  it('renders three guide cards', async () => {
    await renderVideoInputPageWithAuth();

    expect(screen.getByText('没找到合适讲解？')).toBeInTheDocument();
    expect(screen.getByText('登录后看更多')).toBeInTheDocument();
    expect(screen.getByText('网络不稳也能继续')).toBeInTheDocument();
  });

  it('renders the community feed with at least 6 cards', async () => {
    await renderVideoInputPageWithAuth();

    expect(screen.getByText('热门题目讲解视频')).toBeInTheDocument();
    expect(screen.getByText('洛必达法则的完整推导')).toBeInTheDocument();

    const feedCards = screen.getAllByRole('article');
    expect(feedCards.length).toBeGreaterThanOrEqual(6);
  });

  it('does not render backend-only fields in community cards', async () => {
    const { container } = await renderVideoInputPageWithAuth();

    expect(container.textContent).not.toContain('status');
    expect(container.textContent).not.toContain('tenant_id');
  });
});

describe('VideoInputPage - Story 3.2 表单校验与提交', () => {
  beforeEach(() => {
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('空输入提交时展示 inline 错误提示', async () => {
    const user = userEvent.setup();
    await renderVideoInputPageWithAuth();

    const submitButton = screen.getByRole('button', { name: /生成视频/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/请输入至少/)).toBeInTheDocument();
    });
  });

  it('文本输入后创建成功并跳转到 generating 页', async () => {
    const user = userEvent.setup();
    const { router } = await renderVideoInputPageWithAuth();

    const textarea = screen.getByPlaceholderText(/粘贴题目文本/);
    await user.type(textarea, '证明洛必达法则');

    const submitButton = screen.getByRole('button', { name: /生成视频/ });
    await user.click(submitButton);

    /* mock adapter 有 300~800ms 延迟，等待跳转 */
    await waitFor(
      () => {
        expect(router.state.location.pathname).toMatch(/\/video\/.*\/generating/);
      },
      { timeout: 3000 }
    );
  });

  it('提交中 CTA 禁用态，防止重复提交', async () => {
    const user = userEvent.setup();
    await renderVideoInputPageWithAuth();

    const textarea = screen.getByPlaceholderText(/粘贴题目文本/);
    await user.type(textarea, '一道数学题');

    const submitButton = screen.getByRole('button', { name: /生成视频/ });
    await user.click(submitButton);

    /* 提交期间按钮应处于禁用态 */
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /生成中/ });
      expect(btn).toBeDisabled();
    });
  });

  it('建议标签点击后自动填充到输入区', async () => {
    const user = userEvent.setup();
    await renderVideoInputPageWithAuth();

    const pill = screen.getByText('证明洛必达法则');
    await user.click(pill);

    const textarea = screen.getByPlaceholderText(/粘贴题目文本/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('证明洛必达法则');
  });
});
