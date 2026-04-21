/**
 * 文件说明：验证 Story 1.5 用户配置引导页面的关键流转与本地持久化。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { AppProvider } from '@/app/provider/app-provider';
import { ProfileIntroPage } from '@/features/profile/pages/profile-intro-page';
import { ProfilePreferencesPage } from '@/features/profile/pages/profile-preferences-page';
import { ProfileTourPage } from '@/features/profile/pages/profile-tour-page';
import { createMockAuthAdapter } from '@/services/api/adapters';
import { createAuthService } from '@/services/auth';
import {
  resetAuthSessionStore,
  useAuthSessionStore
} from '@/stores/auth-session-store';
import {
  resetUserProfileStore,
  useUserProfileStore
} from '@/features/profile/stores/user-profile-store';

const mockAuthService = createAuthService(createMockAuthAdapter());

/**
 * 预置一个可用登录态，供 onboarding 页面直接消费。
 *
 * @returns 当前测试使用的会话。
 */
async function seedSession() {
  const session = await mockAuthService.login({
    username: 'admin',
    password: 'admin123'
  });

  useAuthSessionStore.getState().setSession(session);

  return session;
}

/**
 * 创建 onboarding 相关的最小测试路由树。
 *
 * @param initialEntries - 初始路由。
 * @returns 内存路由实例。
 */
function createOnboardingRouter(initialEntries: string[]) {
  return createMemoryRouter(
    [
      {
        path: '/',
        element: <div>Home route</div>
      },
      {
        path: '/video/input',
        element: <div>Video input route</div>
      },
      {
        path: '/profile/setup',
        element: <ProfileIntroPage />
      },
      {
        path: '/profile/setup/preferences',
        element: <ProfilePreferencesPage />
      },
      {
        path: '/profile/setup/tour',
        element: <ProfileTourPage />
      }
    ],
    {
      initialEntries
    }
  );
}

describe('Profile onboarding', () => {
  beforeEach(async () => {
    resetAuthSessionStore();
    resetUserProfileStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = 'light';
    await appI18n.changeLanguage('zh-CN');
  });

  it('routes empty intro submissions to the preferences step and preserves returnTo', async () => {
    const session = await seedSession();
    const router = createOnboardingRouter(['/profile/setup?returnTo=/video/input']);
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/profile/setup/preferences');
    });

    expect(router.state.location.search).toBe('?returnTo=%2Fvideo%2Finput');
    expect(useUserProfileStore.getState().profilesByUserId[session.user.id]?.bio).toBe('');
  });

  it('routes filled intro submissions to the preferences step and persists the bio when preferences are missing', async () => {
    const session = await seedSession();
    const router = createOnboardingRouter(['/profile/setup?returnTo=/video/input']);
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.type(
      screen.getByLabelText('个人简介'),
      '我是一名正在准备英语六级考试的大二学生。'
    );
    await user.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/profile/setup/preferences');
    });

    expect(useUserProfileStore.getState().profilesByUserId[session.user.id]?.bio).toContain(
      '英语六级'
    );
  });

  it('routes filled intro submissions directly to the tour when preferences already exist', async () => {
    const session = await seedSession();
    const router = createOnboardingRouter(['/profile/setup?returnTo=/video/input']);
    const user = userEvent.setup();

    useUserProfileStore.getState().setProfile({
      id: null,
      userId: session.user.id,
      avatarUrl: null,
      bio: '',
      schoolName: '',
      majorName: '',
      identityLabel: '',
      gradeLabel: '',
      personalityType: 'action_oriented',
      teacherTags: ['humorous'],
      language: 'zh-CN',
      notificationEnabled: true,
      isCompleted: false,
      createTime: null,
      updateTime: null
    });

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.clear(screen.getByLabelText('个人简介'));
    await user.type(
      screen.getByLabelText('个人简介'),
      '我是一名正在准备英语六级考试的大二学生。'
    );
    await user.click(screen.getByRole('button', { name: '下一步' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/profile/setup/tour');
    });

    expect(useUserProfileStore.getState().profilesByUserId[session.user.id]?.bio).toContain(
      '英语六级'
    );
  });

  it('collects personality and teacher tags before continuing to the tour', async () => {
    const session = await seedSession();
    const router = createOnboardingRouter([
      '/profile/setup/preferences?returnTo=/video/input'
    ]);
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.click(
      screen.getByRole('button', { name: '目标明确，专注结果的行动派' })
    );
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '幽默风趣' }));
    await user.click(screen.getByRole('button', { name: '严密逻辑' }));
    await user.click(screen.getByRole('button', { name: '继续' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/profile/setup/tour');
    });

    expect(
      useUserProfileStore.getState().profilesByUserId[session.user.id]?.personalityType
    ).toBe('action_oriented');
    expect(
      useUserProfileStore.getState().profilesByUserId[session.user.id]?.teacherTags
    ).toEqual(['humorous', 'logical']);
  });

  it('marks onboarding complete after the tour and restores the original returnTo', async () => {
    const session = await seedSession();
    const router = createOnboardingRouter(['/profile/setup/tour?returnTo=/video/input']);
    const user = userEvent.setup();

    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );

    await user.click(screen.getByRole('button', { name: '继续' }));
    await user.click(screen.getByRole('button', { name: '继续' }));
    await user.click(screen.getByRole('button', { name: '进入小麦' }));

    expect(await screen.findByText('Video input route')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        useUserProfileStore.getState().profilesByUserId[session.user.id]?.isCompleted
      ).toBe(true);
    });
  });
});
