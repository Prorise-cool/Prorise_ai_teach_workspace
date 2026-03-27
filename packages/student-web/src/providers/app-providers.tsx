/**
 * 全局 provider 入口。
 * 当前负责认证态预热与消息提示，避免把初始化逻辑散落到页面组件中。
 */
import { type PropsWithChildren, useEffect } from 'react'
import { Toaster } from 'sonner'

import { useAuth } from '@/hooks/useAuth'

function AuthBootstrap() {
  const initialize = useAuth().initialize

  useEffect(() => {
    // 应用启动时先恢复本地认证态，再决定首页展示哪一种联调状态。
    void initialize()
  }, [initialize])

  return null
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      <AuthBootstrap />
      {children}
      <Toaster position="top-right" richColors />
    </>
  )
}
