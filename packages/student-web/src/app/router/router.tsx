/**
 * 文件说明：浏览器路由宿主。
 * 负责把已装配好的路由对象挂到 React Router Provider。
 */
import { RouterProvider } from 'react-router-dom';

import { appRouter } from '@/app/routes';

/**
 * 渲染 React Router Provider，并挂载应用路由对象。
 *
 * @returns 浏览器路由宿主节点。
 */
export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
