/**
 * 文件说明：应用路由表。
 * 统一定义页面级懒加载策略，确保业务页面按路由切分 chunk。
 */
import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { RequireAuthRoute } from '@/features/auth/components/require-auth-route';

/**
 * 按需加载首页路由模块，确保首页以独立 chunk 输出。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadHomeRoute() {
  const { HomePage } = await import('@/features/home/home-page');

  return {
    Component: HomePage
  };
}

/**
 * 按需加载公开落地页，确保营销页独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadLandingRoute() {
  const { LandingPage } = await import('@/features/home/landing-page');

  return {
    Component: LandingPage
  };
}

/**
 * 按需加载认证页路由模块，确保登录页单独分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadLoginRoute() {
  const { LoginPage } = await import('@/features/auth/pages/login-page');

  return {
    Component: LoginPage
  };
}

/**
 * 按需加载第三方登录回调页，确保认证扩展流程单独分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadSocialCallbackRoute() {
  const { SocialCallbackPage } = await import(
    '@/features/auth/pages/social-callback-page'
  );

  return {
    Component: SocialCallbackPage
  };
}

/**
 * 按需加载权限不足页，确保认证异常分支独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadForbiddenRoute() {
  const { ForbiddenPage } = await import('@/features/auth/pages/forbidden-page');

  return {
    Component: ForbiddenPage
  };
}

/**
 * 按需加载课堂输入页，确保受保护工作区独立分包。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadClassroomInputRoute() {
  const { ClassroomInputPage } = await import(
    '@/features/classroom/pages/classroom-input-page'
  );

  return {
    Component: ClassroomInputPage
  };
}

/**
 * 按需加载用户配置引导第一页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfileSetupRoute() {
  const { ProfileIntroPage } = await import(
    '@/features/profile/pages/profile-intro-page'
  );

  return {
    Component: ProfileIntroPage
  };
}

/**
 * 按需加载用户配置偏好收集页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfilePreferencesRoute() {
  const { ProfilePreferencesPage } = await import(
    '@/features/profile/pages/profile-preferences-page'
  );

  return {
    Component: ProfilePreferencesPage
  };
}

/**
 * 按需加载用户配置导览页。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadProfileTourRoute() {
  const { ProfileTourPage } = await import(
    '@/features/profile/pages/profile-tour-page'
  );

  return {
    Component: ProfileTourPage
  };
}

/**
 * 按需加载视频输入页，确保其他入口按路由切分。
 *
 * @returns React Router 可消费的懒加载路由定义。
 */
async function loadVideoInputRoute() {
  const { VideoInputPage } = await import('@/features/video/pages/video-input-page');

  return {
    Component: VideoInputPage
  };
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        lazy: loadHomeRoute
      },
      {
        path: 'landing',
        lazy: loadLandingRoute
      },
      {
        element: <RequireAuthRoute />,
        children: [
          {
            path: 'profile/setup',
            lazy: loadProfileSetupRoute
          },
          {
            path: 'profile/setup/preferences',
            lazy: loadProfilePreferencesRoute
          },
          {
            path: 'profile/setup/tour',
            lazy: loadProfileTourRoute
          },
          {
            path: 'classroom/input',
            lazy: loadClassroomInputRoute
          },
          {
            path: 'video/input',
            lazy: loadVideoInputRoute
          }
        ]
      },
      {
        path: 'login',
        lazy: loadLoginRoute
      },
      {
        path: 'login/social-callback',
        lazy: loadSocialCallbackRoute
      },
      {
        path: 'forbidden',
        lazy: loadForbiddenRoute
      }
    ]
  }
]);
