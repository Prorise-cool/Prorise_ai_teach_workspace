/**
 * 文件说明：验证课堂输入页正确渲染共享组件与课堂专属输入卡片。
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { ClassroomInputPage } from '@/features/classroom/pages/classroom-input-page';
import { renderWithApp } from '@/test/utils/render-app';
import { resetAppTestState, seedMockAuthSession } from '@/test/utils/session';

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
  beforeEach(async () => {
    await resetAppTestState({ resetProfile: false });
  });

  it('renders the header with badge and gradient title', async () => {
    await seedMockAuthSession();
    const router = createClassroomRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(screen.getByText('Classroom Builder')).toBeInTheDocument();
    expect(screen.getByText(/即刻生成完整虚拟课堂/)).toBeInTheDocument();
  });

  it('renders the submit button and suggestion pills', async () => {
    await seedMockAuthSession();
    const router = createClassroomRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(
      screen.getByRole('button', { name: /生成课堂/ })
    ).toBeInTheDocument();
    expect(screen.getByText('二叉树原理图解')).toBeInTheDocument();
  });

  it('renders the community feed with at least 6 cards', async () => {
    await seedMockAuthSession();
    const router = createClassroomRouter();

    renderWithApp(<RouterProvider router={router} />);

    expect(screen.getByText('探索优质课堂案例')).toBeInTheDocument();
    expect(screen.getByText('微积分基本定理系统精讲')).toBeInTheDocument();

    const feedCards = screen.getAllByRole('article');
    expect(feedCards.length).toBeGreaterThanOrEqual(6);
  });

  it('does not render backend-only fields in community cards', async () => {
    await seedMockAuthSession();
    const router = createClassroomRouter();

    const { container } = renderWithApp(<RouterProvider router={router} />);

    expect(container.textContent).not.toContain('status');
    expect(container.textContent).not.toContain('tenant_id');
  });

  it('toggles the web search button', async () => {
    await seedMockAuthSession();
    const router = createClassroomRouter();
    const user = userEvent.setup();

    renderWithApp(<RouterProvider router={router} />);

    const toggleBtn = screen.getByRole('button', { name: /开启联网/ });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).not.toHaveClass('xm-classroom-input__card-toggle--active');

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveClass('xm-classroom-input__card-toggle--active');
  });
});
