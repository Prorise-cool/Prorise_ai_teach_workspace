/**
 * 文件说明：提供用户配置的 real / local fallback API。
 * 在真实接口缺位时优先回退到本地持久化，保证 onboarding 流程可先跑通。
 */
import { pickAdapterImplementation } from '@/services/api/adapters/base-adapter';
import {
  apiClient,
  ApiClientError,
  withAuthHeader,
  type ApiClient,
  type ApiRequestConfig
} from '@/services/api/client';
import { readNumberProperty, readRecord, readStringProperty } from '@/lib/type-guards';
import { AUTH_SUCCESS_CODE, type RuoyiEnvelope } from '@/types/auth';
import {
  createEmptyUserProfile,
  mergeUserProfile,
  PROFILE_API_BASE_PATH,
  PROFILE_DEFAULT_LANGUAGE,
  PROFILE_THEME_MODES,
  TEACHER_TAGS,
  type ProfileThemeMode,
  type SaveUserProfileInput,
  type TeacherTag,
  type UserProfile
} from '@/features/profile/types';
import { useUserProfileStore } from '@/features/profile/stores/user-profile-store';

type ProfilePayload = {
  id?: number | null;
  userId?: string | number | null;
  user_id?: string | number | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  schoolName?: string | null;
  school_name?: string | null;
  majorName?: string | null;
  major_name?: string | null;
  identityLabel?: string | null;
  identity_label?: string | null;
  gradeLabel?: string | null;
  grade_label?: string | null;
  personalityType?: string | null;
  personality_type?: string | null;
  teacherTags?: string[] | string | null;
  teacher_tags?: string[] | string | null;
  language?: string | null;
  themeMode?: string | null;
  theme_mode?: string | null;
  notificationEnabled?: boolean | number | string | null;
  notification_enabled?: boolean | number | string | null;
  isCompleted?: boolean | number | string | null;
  is_completed?: boolean | number | string | null;
  createTime?: string | null;
  create_time?: string | null;
  updateTime?: string | null;
  update_time?: string | null;
};

type ProfileApi = {
  getCurrentProfile(userId: string, accessToken?: string): Promise<UserProfile | null>;
  uploadAvatar(file: File, accessToken?: string): Promise<string>;
  saveProfile(
    userId: string,
    input: SaveUserProfileInput,
    accessToken?: string
  ): Promise<UserProfile>;
};

type ResolveProfileApiOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealProfileApiOptions = {
  client?: ApiClient;
};

type AvatarUploadPayload = {
  imgUrl?: string | null;
  url?: string | null;
};

const PROFILE_AVATAR_UPLOAD_PATH = '/system/user/profile/avatar';

function unwrapRuoyiEnvelope<T>(payload: unknown, status: number) {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '用户配置接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message = readStringProperty(envelope, 'msg') ?? '用户配置接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '用户配置接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== AUTH_SUCCESS_CODE) {
    throw new ApiClientError(status, message, payload);
  }

  return envelope.data as T;
}

function parseTeacherTags(value: unknown): TeacherTag[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is TeacherTag =>
        typeof item === 'string' &&
        (TEACHER_TAGS as readonly string[]).includes(item)
    );
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsedValue = JSON.parse(value) as unknown;

      return parseTeacherTags(parsedValue);
    } catch {
      return [];
    }
  }

  return [];
}

function parseThemeMode(value: unknown): ProfileThemeMode | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return (PROFILE_THEME_MODES as readonly string[]).includes(normalized)
    ? (normalized as ProfileThemeMode)
    : null;
}

function parseCompletedFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    return value === '1' || value === 'true';
  }

  return false;
}

function mapProfilePayload(userId: string, payload: ProfilePayload): UserProfile {
  const normalizedUserId =
    String(payload.userId ?? payload.user_id ?? userId);

  return {
    id: payload.id ?? null,
    userId: normalizedUserId,
    avatarUrl: payload.avatarUrl ?? payload.avatar_url ?? null,
    bio: payload.bio?.trim() ?? '',
    schoolName: payload.schoolName?.trim() ?? payload.school_name?.trim() ?? '',
    majorName: payload.majorName?.trim() ?? payload.major_name?.trim() ?? '',
    identityLabel: payload.identityLabel?.trim() ?? payload.identity_label?.trim() ?? '',
    gradeLabel: payload.gradeLabel?.trim() ?? payload.grade_label?.trim() ?? '',
    personalityType:
      (payload.personalityType ?? payload.personality_type ?? null) as UserProfile['personalityType'],
    teacherTags: parseTeacherTags(payload.teacherTags ?? payload.teacher_tags),
    language:
      payload.language === 'en-US' ? 'en-US' : PROFILE_DEFAULT_LANGUAGE,
    themeMode: parseThemeMode(payload.themeMode ?? payload.theme_mode),
    notificationEnabled: parseCompletedFlag(
      payload.notificationEnabled ?? payload.notification_enabled
    ),
    isCompleted: parseCompletedFlag(
      payload.isCompleted ?? payload.is_completed
    ),
    createTime: payload.createTime ?? payload.create_time ?? null,
    updateTime: payload.updateTime ?? payload.update_time ?? null
  };
}

function readLocalProfile(userId: string) {
  return useUserProfileStore.getState().profilesByUserId[userId] ?? null;
}

function writeLocalProfile(profile: UserProfile) {
  useUserProfileStore.getState().setProfile(profile);

  return profile;
}

function clearLocalProfile(userId: string) {
  useUserProfileStore.getState().removeProfile(userId);
}

function shouldFallbackToLocal(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return false;
  }

  if ([404, 405, 501].includes(error.status)) {
    return true;
  }

  return (
    error.status === 500
    && error.response === undefined
    && error.data === undefined
    && /failed to parse url|fetch failed/i.test(error.message)
  );
}

async function requestProfileEnvelope<T>(
  client: ApiClient,
  config: ApiRequestConfig,
  accessToken?: string
) {
  const response = await client.request<RuoyiEnvelope<T>>({
    ...config,
    authFailureMode: 'manual',
    headers: withAuthHeader(config.headers, accessToken)
  });

  return unwrapRuoyiEnvelope<T>(response.data, response.status);
}

function createMockProfileApi(): ProfileApi {
  return {
    getCurrentProfile(userId) {
      return Promise.resolve(readLocalProfile(userId));
    },
    uploadAvatar(file) {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return Promise.resolve(URL.createObjectURL(file));
      }

      return Promise.resolve(`mock-avatar://${encodeURIComponent(file.name)}`);
    },
    saveProfile(userId, input) {
      const currentProfile =
        readLocalProfile(userId) ??
        createEmptyUserProfile(userId, input.language ?? PROFILE_DEFAULT_LANGUAGE);
      const nextProfile = writeLocalProfile(
        mergeUserProfile(currentProfile, input)
      );

      return Promise.resolve(nextProfile);
    }
  };
}

function createRealProfileApi({
  client = apiClient
}: RealProfileApiOptions = {}): ProfileApi {
  return {
    async getCurrentProfile(userId, accessToken) {
      try {
        const payload = await requestProfileEnvelope<ProfilePayload | null>(
          client,
          {
            url: PROFILE_API_BASE_PATH,
            method: 'get'
          },
          accessToken
        );

        if (!payload) {
          clearLocalProfile(userId);
          return null;
        }

        return writeLocalProfile(mapProfilePayload(userId, payload));
      } catch (error) {
        if (shouldFallbackToLocal(error)) {
          return readLocalProfile(userId);
        }

        throw error;
      }
    },
    async uploadAvatar(file, accessToken) {
      const formData = new FormData();
      formData.append('avatarfile', file);

      const payload = await requestProfileEnvelope<AvatarUploadPayload>(
        client,
        {
          url: PROFILE_AVATAR_UPLOAD_PATH,
          method: 'post',
          data: formData
        },
          accessToken
      );

      const avatarPayload = readRecord(payload);
      const avatarUrl = avatarPayload
        ? readStringProperty(avatarPayload, 'imgUrl')
          ?? readStringProperty(avatarPayload, 'url')
        : undefined;

      if (!avatarUrl) {
        throw new ApiClientError(500, '头像上传接口返回异常', payload);
      }

      return avatarUrl;
    },
    async saveProfile(userId, input, accessToken) {
      const currentProfile =
        readLocalProfile(userId) ??
        createEmptyUserProfile(userId, input.language ?? PROFILE_DEFAULT_LANGUAGE);
      const nextProfile = mergeUserProfile(currentProfile, input);

      try {
        const payload = await requestProfileEnvelope<ProfilePayload>(
          client,
          {
            url: PROFILE_API_BASE_PATH,
            method: nextProfile.id ? 'put' : 'post',
            data: {
              id: nextProfile.id ?? undefined,
              avatarUrl: nextProfile.avatarUrl,
              bio: nextProfile.bio,
              schoolName: nextProfile.schoolName,
              majorName: nextProfile.majorName,
              identityLabel: nextProfile.identityLabel,
              gradeLabel: nextProfile.gradeLabel,
              personalityType: nextProfile.personalityType,
              teacherTags: JSON.stringify(nextProfile.teacherTags),
              language: nextProfile.language,
              themeMode: nextProfile.themeMode,
              notificationEnabled: nextProfile.notificationEnabled ? 1 : 0,
              isCompleted: nextProfile.isCompleted ? 1 : 0
            }
          },
          accessToken
        );

        return writeLocalProfile(mapProfilePayload(userId, payload));
      } catch (error) {
        if (shouldFallbackToLocal(error)) {
          return writeLocalProfile(nextProfile);
        }

        throw error;
      }
    }
  };
}

/**
 * 根据运行模式解析用户配置 API。
 *
 * @param options - API 解析参数。
 * @returns 当前模式可用的用户配置 API。
 */
export function resolveProfileApi(
  options: ResolveProfileApiOptions = {}
) {
  return pickAdapterImplementation<ProfileApi>(
    {
      mock: createMockProfileApi(),
      real: createRealProfileApi({
        client: options.client ?? apiClient
      })
    },
    {
      useMock: options.useMock
    }
  );
}

export const profileApi = resolveProfileApi();

// resolvePostAuthDestination has been moved to @/services/post-auth to break the auth↔profile circular dependency.
// Import it from '@/services/post-auth' instead.
