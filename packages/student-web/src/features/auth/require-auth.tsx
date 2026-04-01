/**
 * 文件说明：对受保护页面执行统一登录检查与 returnTo 回跳保留。
 */
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { buildLoginHref } from '@/features/auth/use-auth-redirect';
import { useAuthStore } from '@/stores/auth-store';

export function RequireAuth({ children }: PropsWithChildren) {
  const session = useAuthStore(state => state.session);
  const location = useLocation();

  if (!session) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        replace
        to={buildLoginHref(returnTo)}
        state={{
          returnTo
        }}
      />
    );
  }

  return <>{children}</>;
}
