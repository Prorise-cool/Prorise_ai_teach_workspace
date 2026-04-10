/**
 * 文件说明：解析认证成功后应前往的地址。
 * 从 profile API 层抽取到 services，避免 auth ↔ profile 双向依赖。
 */
import { profileApi } from '@/features/profile/api/profile-api';
import {
  buildProfileSetupPath,
  resolveProfileReturnTo
} from '@/features/profile/shared/profile-routing';

/**
 * 解析认证成功后应前往的地址。
 *
 * @param options - 导航解析参数。
 * @param options.userId - 当前用户 ID。
 * @param options.accessToken - 当前访问令牌。
 * @param options.returnTo - 原始业务回跳目标。
 * @returns onboarding 或业务页地址。
 */
export async function resolvePostAuthDestination({
  userId,
  accessToken,
  returnTo
}: {
  userId: string;
  accessToken?: string;
  returnTo?: string;
}) {
  const profile = await profileApi.getCurrentProfile(userId, accessToken);

  if (profile?.isCompleted) {
    return resolveProfileReturnTo(returnTo);
  }

  return buildProfileSetupPath(returnTo);
}
