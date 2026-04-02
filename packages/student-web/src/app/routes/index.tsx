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

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        element: <RequireAuthRoute />,
        children: [
          {
            index: true,
            lazy: loadHomeRoute
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
      }
    ]
  }
]);
