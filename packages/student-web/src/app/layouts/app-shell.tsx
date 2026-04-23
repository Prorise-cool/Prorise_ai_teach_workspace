/**
 * 文件说明：应用级页面壳层。
 * 当前承接全局背景、全局 ErrorBoundary 以及 Outlet，供业务页面复用统一宿主。
 *
 * Wave 2：在 Outlet 外套一层 {@link ErrorBoundary}，避免渲染/生命周期
 * 异常把整页打成白屏；默认重试按钮会触发路由重载。
 */
import { Outlet } from 'react-router-dom';

import { ErrorBoundary } from '@/components/error-boundary';
import { AuthRuntimeBridge } from '@/features/auth/components/auth-runtime-bridge';

/**
 * 渲染应用公共壳层，并为业务页面提供统一背景与文本色。
 *
 * @returns 页面壳层节点。
 */
export function AppShell() {
  return (
    <div className="min-h-screen">
      <AuthRuntimeBridge />
      <ErrorBoundary
        title="页面出现错误"
        retryLabel="刷新页面"
        onRetry={() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      >
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
