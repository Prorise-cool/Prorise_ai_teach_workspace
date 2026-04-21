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
export type ProfileThemeMode = 'light' | 'dark' | 'system';
export const PROFILE_THEME_MODES: readonly ProfileThemeMode[] = ['light', 'dark', 'system'];

export interface UserProfile {
  id: number | null;
  userId: string;
  avatarUrl: string | null;
  bio: string;
  schoolName: string;
  majorName: string;
  identityLabel: string;
  gradeLabel: string;
  personalityType: PersonalityType | null;
  teacherTags: TeacherTag[];
  language: ProfileLanguage;
  themeMode: ProfileThemeMode | null;
  notificationEnabled: boolean;
  isCompleted: boolean;
  createTime: string | null;
  updateTime: string | null;
}

export interface SaveUserProfileInput {
  avatarUrl?: string | null;
  bio?: string;
  schoolName?: string;
  majorName?: string;
  identityLabel?: string;
  gradeLabel?: string;
  personalityType?: PersonalityType | null;
  teacherTags?: TeacherTag[];
  language?: ProfileLanguage;
  themeMode?: ProfileThemeMode | null;
  notificationEnabled?: boolean;
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
    schoolName: '',
    majorName: '',
    identityLabel: '',
    gradeLabel: '',
    personalityType: null,
    teacherTags: [],
    language,
    themeMode: null,
    notificationEnabled: true,
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
    schoolName:
      input.schoolName !== undefined ? input.schoolName.trim() : currentProfile.schoolName,
    majorName:
      input.majorName !== undefined ? input.majorName.trim() : currentProfile.majorName,
    identityLabel:
      input.identityLabel !== undefined ? input.identityLabel.trim() : currentProfile.identityLabel,
    gradeLabel:
      input.gradeLabel !== undefined ? input.gradeLabel.trim() : currentProfile.gradeLabel,
    personalityType:
      input.personalityType !== undefined
        ? input.personalityType
        : currentProfile.personalityType,
    teacherTags:
      input.teacherTags !== undefined
        ? [...input.teacherTags]
        : currentProfile.teacherTags,
    language: input.language ?? currentProfile.language,
    themeMode:
      input.themeMode !== undefined ? input.themeMode : currentProfile.themeMode,
    notificationEnabled:
      input.notificationEnabled !== undefined
        ? input.notificationEnabled
        : currentProfile.notificationEnabled,
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
