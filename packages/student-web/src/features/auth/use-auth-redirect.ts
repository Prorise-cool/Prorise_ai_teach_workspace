/**
 * 文件说明：集中处理登录回跳解析、登录链接构建与认证成功跳转。
 */
import { useLocation, useNavigate } from 'react-router-dom';

import {
  AUTH_RETURN_TO_KEY,
  normalizeReturnTo
} from '@/services/auth';
import { HOME_ROUTE, LOGIN_ROUTE } from '@/features/navigation/route-paths';

type AuthRedirectState = {
  returnTo?: string;
};

/** 从 location search / state 中解析当前合法回跳地址。 */
export function resolveReturnToFromLocation(
  search: string,
  state?: AuthRedirectState | null
) {
  const searchParams = new URLSearchParams(search);
  const searchValue = searchParams.get(AUTH_RETURN_TO_KEY);
  const stateValue = state?.returnTo;

  return normalizeReturnTo(searchValue ?? stateValue ?? HOME_ROUTE);
}

/** 构造登录页链接，并保持 returnTo 统一语义。 */
export function buildLoginHref(returnTo: string) {
  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_KEY]: normalizeReturnTo(returnTo)
  });

  return `${LOGIN_ROUTE}?${searchParams.toString()}`;
}

/** 提供组件内可复用的认证回跳能力。 */
export function useAuthRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = resolveReturnToFromLocation(
    location.search,
    location.state as AuthRedirectState | null
  );

  return {
    returnTo,
    buildLoginHref,
    redirectAfterAuth: (targetPath = returnTo) => {
      void navigate(normalizeReturnTo(targetPath), {
        replace: true
      });
    }
  };
}
