/**
 * 文件说明：集中维护认证会话的本地持久化读写。
 */
import type { AuthSession } from '@/types/auth';

const AUTH_SESSION_STORAGE_KEY = 'xm-auth-session';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** 读取当前持久化会话。 */
export function readStoredAuthSession() {
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

    return null;
  }
}

/** 写入当前持久化会话。 */
export function writeStoredAuthSession(session: AuthSession) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** 清理当前持久化会话。 */
export function clearStoredAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

/** 读取当前 access token，供 API client 注入。 */
export function readStoredAccessToken() {
  return readStoredAuthSession()?.accessToken;
}
