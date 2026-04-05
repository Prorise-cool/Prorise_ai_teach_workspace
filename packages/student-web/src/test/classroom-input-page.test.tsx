/**
 * 文件说明：验证课堂输入页正确渲染共享组件与课堂专属输入卡片。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { ClassroomInputPage } from '@/features/classroom/classroom-input-page';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';
import { createAuthService } from '@/services/auth';
import { createMockAuthAdapter } from '@/services/api/adapters';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 构造课堂输入页路由。
 *
 * @returns 内存路由实例。
 */
function createClassroomRouter() {
  return createMemoryRouter(
    [
      {
        path: '/classroom/input',
        element: <ClassroomInputPage />
      }
    ],
    {
      initialEntries: ['/classroom/input']
    }
  );
}

describe('ClassroomInputPage', () => {
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
    const router = createClassroomRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.getByText('Classroom Builder')).toBeInTheDocument();
    expect(screen.getByText(/即刻生成完整虚拟课堂/)).toBeInTheDocument();
  });

  it('renders the submit button and suggestion pills', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createClassroomRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(
      screen.getByRole('button', { name: /生成课堂/ })
    ).toBeInTheDocument();
    expect(screen.getByText('二叉树原理图解')).toBeInTheDocument();
  });

  it('renders three guide cards', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createClassroomRouter();

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
    const router = createClassroomRouter();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(screen.getByText('探索优质课堂案例')).toBeInTheDocument();
    expect(screen.getByText('微积分基本定理系统精讲')).toBeInTheDocument();

    const feedCards = screen.getAllByRole('article');
    expect(feedCards.length).toBeGreaterThanOrEqual(6);
  });

  it('does not render backend-only fields in community cards', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createClassroomRouter();

    const { container } = render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    expect(container.textContent).not.toContain('status');
    expect(container.textContent).not.toContain('tenant_id');
  });

  it('toggles the web search button', async () => {
    const session = await mockAuthService.login({
      username: 'admin',
      password: 'admin123'
    });

    useAuthSessionStore.getState().setSession(session);
    const router = createClassroomRouter();
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /开启联网/ });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).not.toHaveClass('xm-classroom-input__card-toggle--active');

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveClass('xm-classroom-input__card-toggle--active');
  });
});
