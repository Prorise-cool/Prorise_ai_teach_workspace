/**
 * 应用根组件。
 * 当前仅负责串联全局 provider 与路由容器，不承载具体业务页面逻辑。
 */
import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/providers/app-providers'
import { appRouter } from '@/router'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  )
}

export default App
