/**
 * 文件说明：TanStack Query Provider。
 * 负责创建单例 QueryClient，并统一注入默认查询策略。
 */
import type { PropsWithChildren } from 'react';
import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * 创建并注入应用唯一的 `QueryClient` 实例。
 *
 * @param props - Provider 参数。
 * @param props.children - 需要访问查询上下文的子节点。
 * @returns Query Provider 节点。
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
