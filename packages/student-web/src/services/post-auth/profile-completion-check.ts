/**
 * 文件说明：用户配置完成状态检查。
 * 从 require-auth-route 抽取，避免 auth ↔ profile 双向依赖。
 */
import { profileApi } from '@/features/profile/api/profile-api';
import {
  buildProfileSetupPath,
  isProfileOnboardingPath
} from '@/features/profile/shared/profile-routing';

export { isProfileOnboardingPath, buildProfileSetupPath } from '@/features/profile/shared/profile-routing';

/**
 * 检查用户配置是否已完成。
 *
 * @param userId - 用户 ID。
 * @param accessToken - 访问令牌。
 * @returns 是否已完成配置。
 */
export async function checkProfileCompleted(
  userId: string,
  accessToken?: string
): Promise<boolean> {
  const profile = await profileApi.getCurrentProfile(userId, accessToken);
  return profile?.isCompleted ?? false;
}
