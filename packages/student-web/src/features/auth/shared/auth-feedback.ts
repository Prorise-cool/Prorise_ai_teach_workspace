/**
 * 文件说明：认证页错误反馈工具。
 * 负责把 adapter 错误归一成页面可展示的安全文案。
 */
import { isAuthError } from '@/services/api/adapters';

const CREDENTIAL_FAILURE_KEYWORDS = [
  '账号或密码',
  '用户名或密码',
  'bad credentials',
  'invalid credentials'
] as const;

/**
 * 判断异常是否属于账号密码校验失败场景。
 *
 * @param error - 待判断的异常对象。
 * @returns 是否为凭证错误。
 */
export function isCredentialFailure(error: unknown) {
  if (!isAuthError(error) || error.status !== 401) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();

  return CREDENTIAL_FAILURE_KEYWORDS.some(keyword =>
    normalizedMessage.includes(keyword.toLowerCase())
  );
}

/**
 * 把认证相关异常转换为可直接展示给用户的安全提示文案。
 *
 * @param error - 原始异常对象。
 * @param fallbackMessage - 默认兜底文案。
 * @returns 适合展示在页面上的错误提示。
 */
export function getAuthFeedbackMessage(
  error: unknown,
  fallbackMessage: string
) {
  if (isAuthError(error)) {
    if (error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
