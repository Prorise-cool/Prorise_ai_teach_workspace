/**
 * 文件说明：把全局 HTTP 认证失败事件桥接到路由导航与本地会话收口。
 * 负责统一处理非认证页业务请求返回的 401 / 403。
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { setAuthFailureHandler } from '@/services/api/auth-failure';
import { AUTH_RETURN_TO_KEY, normalizeReturnTo } from '@/services/auth';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import {
  AUTH_FORBIDDEN_PATH,
  AUTH_LOGIN_PATH,
  AUTH_UNAUTHORIZED_STATUS,
  DEFAULT_AUTH_RETURN_TO
} from '@/types/auth';

const AUTH_FAILURE_DEDUPE_WINDOW_MS = 800;

/**
 * 把当前位置序列化为安全回跳地址。
 *
 * @param pathname - 当前路径。
 * @param search - 当前查询参数。
 * @param hash - 当前锚点。
 * @returns 归一化后的站内地址。
 */
function resolveCurrentReturnTo(
  pathname: string,
  search: string,
  hash: string
) {
  return normalizeReturnTo(
    `${pathname}${search}${hash}`,
    DEFAULT_AUTH_RETURN_TO
  );
}

/**
 * 监听全局认证失败事件，并统一执行导航与会话处理。
 *
 * @returns 无渲染输出。
 */
export function AuthRuntimeBridge() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const clearSession = useAuthSessionStore(state => state.clearSession);
  const lastHandledRef = useRef<{
    key: string;
    occurredAt: number;
  } | null>(null);

  useEffect(() => {
    return setAuthFailureHandler(event => {
      const returnTo = resolveCurrentReturnTo(
        location.pathname,
        location.search,
        location.hash
      );
      const eventKey = `${event.status}:${returnTo}:${event.requestUrl}`;
      const lastHandled = lastHandledRef.current;

      if (
        lastHandled &&
        lastHandled.key === eventKey &&
        event.occurredAt - lastHandled.occurredAt < AUTH_FAILURE_DEDUPE_WINDOW_MS
      ) {
        return;
      }

      lastHandledRef.current = {
        key: eventKey,
        occurredAt: event.occurredAt
      };

      if (event.status === AUTH_UNAUTHORIZED_STATUS) {
        clearSession();
        notify({
          tone: 'warning',
          title: t('auth.feedback.sessionExpiredTitle'),
          description: event.message || t('auth.feedback.sessionExpiredMessage')
        });

        if (location.pathname === AUTH_LOGIN_PATH) {
          return;
        }

        void navigate(
          {
            pathname: AUTH_LOGIN_PATH,
            search:
              returnTo === DEFAULT_AUTH_RETURN_TO
                ? ''
                : `?${AUTH_RETURN_TO_KEY}=${encodeURIComponent(returnTo)}`
          },
          {
            replace: true,
            state: {
              returnTo
            }
          }
        );

        return;
      }

      notify({
        tone: 'warning',
        title: t('auth.feedback.permissionDeniedTitle'),
        description: event.message || t('auth.feedback.permissionDeniedMessage')
      });

      if (location.pathname === AUTH_FORBIDDEN_PATH) {
        return;
      }

      void navigate(AUTH_FORBIDDEN_PATH, {
        replace: true,
        state: {
          from: returnTo,
          message: event.message,
          requestUrl: event.requestUrl,
          responseCode: event.responseCode
        }
      });
    });
  }, [
    clearSession,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    notify,
    t
  ]);

  return null;
}
