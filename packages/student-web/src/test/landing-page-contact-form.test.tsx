/**
 * 文件说明：验证落地页联系表单的真实提交反馈、重置与失败保留行为。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

const { submitLeadMock } = vi.hoisted(() => ({
  submitLeadMock: vi.fn()
}));

vi.mock('@/features/home/api/landing-lead-api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/home/api/landing-lead-api')>(
      '@/features/home/api/landing-lead-api'
    );

  return {
    ...actual,
    landingLeadApi: {
      submitLead: submitLeadMock
    }
  };
});

import { appI18n } from '@/app/i18n';
import { AppShell } from '@/app/layouts/app-shell';
import { AppProvider } from '@/app/provider/app-provider';
import { LandingPage } from '@/features/home/landing-page';
import { resetAuthSessionStore } from '@/stores/auth-session-store';

/**
 * 构造仅承载落地页的最小测试路由。
 *
 * @param initialEntries - 初始路由。
 * @returns 测试路由实例。
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

/**
 * 填充落地页联系表单，供不同提交分支复用。
 *
 * @param user - 当前测试用户。
 */
async function fillContactForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('名字'), '小林');
  await user.type(screen.getByLabelText('称呼 / 机构'), '计算机学院');
  await user.type(screen.getByLabelText('邮箱'), 'pilot@example.com');
  await user.selectOptions(screen.getByLabelText('咨询主题'), '教师试点合作');
  await user.type(
    screen.getByLabelText('留言内容'),
    '希望了解试点班的落地节奏和合作方式'
  );
}

describe('LandingPage contact form', () => {
  beforeEach(async () => {
    submitLeadMock.mockReset();
    resetAuthSessionStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = 'light';
    await appI18n.changeLanguage('zh-CN');
  });

  it('submits the form through the landing lead api, shows pending feedback, and resets on success', async () => {
    let resolveSubmission:
      | ((value: { leadId: string; accepted: boolean; message: string }) => void)
      | undefined;

    submitLeadMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveSubmission = resolve;
        })
    );

    const router = createLandingRouter();
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: '发送留言' }));

    await waitFor(() => {
      expect(submitLeadMock).toHaveBeenCalledTimes(1);
    });

    expect(submitLeadMock).toHaveBeenCalledWith({
      contactName: '小林',
      organizationName: '计算机学院',
      contactEmail: 'pilot@example.com',
      subject: '教师试点合作',
      message: '希望了解试点班的落地节奏和合作方式',
      sourcePage: '/landing',
      sourceLocale: 'zh-CN'
    });
    expect(
      screen.getByRole('button', { name: '提交中...' })
    ).toBeDisabled();

    resolveSubmission?.({
      leadId: '101',
      accepted: true,
      message: '线索已受理'
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '发送留言' })).toBeEnabled();
    });

    const successStatuses = await screen.findAllByRole('status');

    expect(
      successStatuses.some(node => node.textContent?.includes('提交成功'))
    ).toBe(true);
    expect(
      successStatuses.some(node => node.textContent?.includes('线索已受理'))
    ).toBe(true);
    expect(screen.getByLabelText('名字')).toHaveValue('');
    expect(screen.getByLabelText('称呼 / 机构')).toHaveValue('');
    expect(screen.getByLabelText('邮箱')).toHaveValue('');
    expect(screen.getByLabelText('咨询主题')).toHaveValue('课堂模式试用');
    expect(screen.getByLabelText('留言内容')).toHaveValue('');
  });

  it('keeps user input and shows an error notice when the submission fails', async () => {
    submitLeadMock.mockRejectedValueOnce(new Error('network error'));

    const router = createLandingRouter();
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: '发送留言' }));

    await waitFor(() => {
      expect(submitLeadMock).toHaveBeenCalledTimes(1);
    });

    const alerts = await screen.findAllByRole('alert');

    expect(
      alerts.some(node => node.textContent?.includes('提交失败'))
    ).toBe(true);
    expect(
      alerts.some(node => node.textContent?.includes('本次提交未成功，请稍后重试。'))
    ).toBe(true);
    expect(screen.getByLabelText('名字')).toHaveValue('小林');
    expect(screen.getByLabelText('称呼 / 机构')).toHaveValue('计算机学院');
    expect(screen.getByLabelText('邮箱')).toHaveValue('pilot@example.com');
    expect(screen.getByLabelText('咨询主题')).toHaveValue('教师试点合作');
    expect(
      screen.getByLabelText('留言内容')
    ).toHaveValue('希望了解试点班的落地节奏和合作方式');
    expect(screen.getByRole('button', { name: '发送留言' })).toBeEnabled();
  });
});
