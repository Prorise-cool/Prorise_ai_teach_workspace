/**
 * 应用路由入口。
 * 当前只保留 Story 1.1 联调所需的首页路由，后续正式页面与受保护路由在此扩展。
 */
import { createBrowserRouter } from 'react-router-dom'

import { HomePage } from '@/pages/home/home-page'

export const appRouter = createBrowserRouter([
  {
    element: <HomePage />,
    path: '/',
  },
])
ß