/**
 * 文件说明：集中封装前端测试所需的 AppProvider 与 Router 渲染入口。
 * 避免各 feature 测试重复拼装全局 Provider、Memory Router 与返回值结构。
 */
import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
  type RouteObject
} from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';

type AppRenderOptions = Omit<RenderOptions, 'wrapper'>;

type RenderRouterWithAppOptions = {
  initialEntries?: InitialEntry[];
  renderOptions?: AppRenderOptions;
};

/**
 * 使用项目级 Provider 渲染单个 React 节点。
 *
 * @param ui - 待渲染节点。
 * @param renderOptions - Testing Library 渲染选项。
 * @returns 标准渲染结果。
 */
export function renderWithApp(ui: ReactElement, renderOptions?: AppRenderOptions) {
  return render(<AppProvider>{ui}</AppProvider>, renderOptions);
}

/**
 * 使用项目级 Provider 与 Memory Router 渲染路由树。
 *
 * @param routes - React Router 路由定义。
 * @param options - 路由渲染选项。
 * @returns 路由实例与 Testing Library 渲染结果。
 */
export function renderRouterWithApp(
  routes: RouteObject[],
  options: RenderRouterWithAppOptions = {}
) {
  const router = createMemoryRouter(routes, {
    initialEntries: options.initialEntries
  });

  return {
    router,
    ...renderWithApp(<RouterProvider router={router} />, options.renderOptions)
  };
}
