/**
 * 文件说明：封装用户配置引导路由与 returnTo 透传规则。
 * 避免登录页、第三方登录回调页和 profile 页面各自手写路径拼接。
 */
import { AUTH_RETURN_TO_KEY, normalizeReturnTo } from '@/services/auth';
import { DEFAULT_AUTH_RETURN_TO } from '@/types/auth';
import {
  PROFILE_PREFERENCES_PATH,
  PROFILE_SETUP_PATH,
  PROFILE_TOUR_PATH
} from '@/features/profile/types';

function buildProfilePath(pathname: string, returnTo?: string) {
  const normalizedReturnTo = normalizeReturnTo(
    returnTo,
    DEFAULT_AUTH_RETURN_TO
  );

  if (normalizedReturnTo === DEFAULT_AUTH_RETURN_TO) {
    return pathname;
  }

  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_KEY]: normalizedReturnTo
  });

  return `${pathname}?${searchParams.toString()}`;
}

/**
 * 构造个人简介页地址。
 *
 * @param returnTo - 登录完成后的业务回跳目标。
 * @returns 可导航的个人简介页地址。
 */
export function buildProfileSetupPath(returnTo?: string) {
  return buildProfilePath(PROFILE_SETUP_PATH, returnTo);
}

/**
 * 构造偏好收集页地址。
 *
 * @param returnTo - 登录完成后的业务回跳目标。
 * @returns 可导航的偏好收集页地址。
 */
export function buildProfilePreferencesPath(returnTo?: string) {
  return buildProfilePath(PROFILE_PREFERENCES_PATH, returnTo);
}

/**
 * 构造导览页地址。
 *
 * @param returnTo - 登录完成后的业务回跳目标。
 * @returns 可导航的导览页地址。
 */
export function buildProfileTourPath(returnTo?: string) {
  return buildProfilePath(PROFILE_TOUR_PATH, returnTo);
}

/**
 * 解析并归一化 profile 页面上的 returnTo 参数。
 *
 * @param rawReturnTo - URL 中读取到的原始回跳地址。
 * @returns 安全的站内回跳地址。
 */
export function resolveProfileReturnTo(rawReturnTo: string | null | undefined) {
  return normalizeReturnTo(rawReturnTo, DEFAULT_AUTH_RETURN_TO);
}

/**
 * 判断当前路径是否属于用户配置引导流程。
 *
 * @param pathname - 当前路由 pathname。
 * @returns 是否为 onboarding 路径。
 */
export function isProfileOnboardingPath(pathname: string) {
  return (
    pathname === PROFILE_SETUP_PATH ||
    pathname === PROFILE_PREFERENCES_PATH ||
    pathname === PROFILE_TOUR_PATH
  );
}
