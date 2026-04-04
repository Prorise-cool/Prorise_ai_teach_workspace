/**
 * 文件说明：定义用户配置引导的领域常量、类型与合并辅助方法。
 * 统一供 profile 页面、store、API 与认证后跳转逻辑复用。
 */

export const PROFILE_SETUP_PATH = '/profile/setup';
export const PROFILE_PREFERENCES_PATH = '/profile/setup/preferences';
export const PROFILE_TOUR_PATH = '/profile/setup/tour';
export const PROFILE_STORAGE_KEY = 'xiaomai-user-profile';
export const PROFILE_API_BASE_PATH = '/api/user/profile';
export const PROFILE_BIO_MAX_LENGTH = 200;
export const PROFILE_DEFAULT_LANGUAGE = 'zh-CN';

export const PERSONALITY_TYPES = [
  'action_oriented',
  'explorer',
  'methodological',
  'social',
  'creative'
] as const;

export const TEACHER_TAGS = [
  'humorous',
  'logical',
  'imaginative',
  'strict',
  'patient',
  'friendly',
  'direct',
  'knowledgeable',
  'encouraging',
  'interactive',
  'calm',
  'passionate'
] as const;

export type PersonalityType = (typeof PERSONALITY_TYPES)[number];
export type TeacherTag = (typeof TEACHER_TAGS)[number];
export type ProfileLanguage = 'zh-CN' | 'en-US';

export interface UserProfile {
  id: number | null;
  userId: string;
  avatarUrl: string | null;
  bio: string;
  personalityType: PersonalityType | null;
  teacherTags: TeacherTag[];
  language: ProfileLanguage;
  isCompleted: boolean;
  createTime: string | null;
  updateTime: string | null;
}

export interface SaveUserProfileInput {
  avatarUrl?: string | null;
  bio?: string;
  personalityType?: PersonalityType | null;
  teacherTags?: TeacherTag[];
  language?: ProfileLanguage;
  isCompleted?: boolean;
}

/**
 * 为指定用户创建空白配置对象。
 *
 * @param userId - 当前登录用户 ID。
 * @param language - 语言偏好。
 * @returns 空白用户配置。
 */
export function createEmptyUserProfile(
  userId: string,
  language: ProfileLanguage = PROFILE_DEFAULT_LANGUAGE
): UserProfile {
  return {
    id: null,
    userId,
    avatarUrl: null,
    bio: '',
    personalityType: null,
    teacherTags: [],
    language,
    isCompleted: false,
    createTime: null,
    updateTime: null
  };
}

/**
 * 把局部输入合并进现有用户配置。
 *
 * @param currentProfile - 当前配置。
 * @param input - 待合并字段。
 * @returns 合并后的配置副本。
 */
export function mergeUserProfile(
  currentProfile: UserProfile,
  input: SaveUserProfileInput
): UserProfile {
  return {
    ...currentProfile,
    avatarUrl:
      input.avatarUrl !== undefined ? input.avatarUrl : currentProfile.avatarUrl,
    bio: input.bio !== undefined ? input.bio.trim() : currentProfile.bio,
    personalityType:
      input.personalityType !== undefined
        ? input.personalityType
        : currentProfile.personalityType,
    teacherTags:
      input.teacherTags !== undefined
        ? [...input.teacherTags]
        : currentProfile.teacherTags,
    language: input.language ?? currentProfile.language,
    isCompleted: input.isCompleted ?? currentProfile.isCompleted
  };
}

/**
 * 判断配置是否已经包含偏好收集页信息。
 *
 * @param profile - 待判断配置。
 * @returns 是否已选性格或导师标签。
 */
export function hasCollectedProfilePreferences(
  profile: UserProfile | null | undefined
) {
  return Boolean(profile?.personalityType) || Boolean(profile?.teacherTags.length);
}
