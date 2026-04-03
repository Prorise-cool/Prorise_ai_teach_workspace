/**
 * 文件说明：维护 student-web 全局认证失败事件分发。
 * 负责把 HTTP 层的 401 / 403 结果桥接到路由与会话处理逻辑。
 */
import {
  AUTH_FORBIDDEN_STATUS,
  AUTH_UNAUTHORIZED_STATUS
} from '@/types/auth';

export type AuthFailureStatus =
  | typeof AUTH_UNAUTHORIZED_STATUS
  | typeof AUTH_FORBIDDEN_STATUS;

export type AuthFailureEvent = {
  status: AuthFailureStatus;
  message: string;
  requestUrl: string;
  responseCode: string | null;
  occurredAt: number;
};

type AuthFailureHandler = (event: AuthFailureEvent) => void;

let authFailureHandler: AuthFailureHandler | null = null;

/**
 * 判断状态码是否属于统一认证失败语义。
 *
 * @param status - 待判断的 HTTP 状态码。
 * @returns 是否为受支持的认证失败状态。
 */
export function isAuthFailureStatus(status: number): status is AuthFailureStatus {
  return (
    status === AUTH_UNAUTHORIZED_STATUS || status === AUTH_FORBIDDEN_STATUS
  );
}

/**
 * 注册全局认证失败处理器。
 *
 * @param handler - 认证失败处理回调；传入 `null` 表示清理。
 * @returns 清理当前回调的函数。
 */
export function setAuthFailureHandler(handler: AuthFailureHandler | null) {
  authFailureHandler = handler;

  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
}

/**
 * 分发认证失败事件。
 *
 * @param event - 待分发的认证失败事件。
 */
export function emitAuthFailure(event: AuthFailureEvent) {
  authFailureHandler?.(event);
}
