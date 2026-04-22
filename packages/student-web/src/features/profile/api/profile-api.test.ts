/**
 * 文件说明：验证用户配置 API 的真实接口契约映射与降级边界。
 */
import { resolveProfileApi } from '@/features/profile/api/profile-api';
import {
	resetUserProfileStore,
	useUserProfileStore
} from '@/features/profile/stores/user-profile-store';
import {
	createEmptyUserProfile,
	type UserProfile
} from '@/features/profile/types';

type RecordedRequest = {
  url?: string;
  method?: string;
  data?: unknown;
};

describe('profile api', () => {
  beforeEach(() => {
    resetUserProfileStore();
  });

  it('serializes teacher tags and completed flag to match the generated RuoYi fields', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          code: 200,
          msg: '操作成功',
          data: {
            id: 101,
            userId: 1,
            bio: '新的简介',
            teacherTags: '["humorous","logical"]',
            isCompleted: 1,
            language: 'zh-CN'
          }
        }
      });
    const api = resolveProfileApi({
      useMock: false,
      client: {
        request
      } as never
    });

    const result = await api.saveProfile(
      '1',
      {
        bio: '新的简介',
        teacherTags: ['humorous', 'logical'],
        isCompleted: true,
        language: 'zh-CN'
      },
      'mock-access-token'
    );

    const requestConfig = request.mock.calls[0]?.[0] as RecordedRequest | undefined;

    expect(requestConfig).toMatchObject({
      url: '/api/user/profile',
      method: 'post'
    });
    expect(requestConfig?.data).toMatchObject({
      bio: '新的简介',
      teacherTags: '["humorous","logical"]',
      isCompleted: 1,
      language: 'zh-CN'
    });
    expect(result.teacherTags).toEqual(['humorous', 'logical']);
    expect(result.isCompleted).toBe(true);
  });

  it('uploads avatar files through the existing system profile endpoint', async () => {
    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '上传成功',
        data: {
          imgUrl: 'https://static.prorise.test/avatar/student.png'
        }
      }
    });
    const api = resolveProfileApi({
      useMock: false,
      client: {
        request
      } as never
    });
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    const avatarUrl = await api.uploadAvatar(file, 'mock-access-token');

    const requestConfig = request.mock.calls[0]?.[0] as RecordedRequest | undefined;
    const formData = requestConfig?.data as FormData;

    expect(requestConfig).toMatchObject({
      url: '/system/user/profile/avatar',
      method: 'post'
    });
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('avatarfile')).toBe(file);
    expect(avatarUrl).toBe('https://static.prorise.test/avatar/student.png');
  });

  it('trusts a real null payload over stale local cache when current profile does not exist', async () => {
    const staleProfile: UserProfile = {
      ...createEmptyUserProfile('1'),
      bio: '本地残留简介',
      isCompleted: true
    };
    useUserProfileStore.getState().setProfile(staleProfile);

    const request = vi.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        msg: '查询成功',
        data: null
      }
    });
    const api = resolveProfileApi({
      useMock: false,
      client: {
        request
      } as never
    });

    const result = await api.getCurrentProfile('1', 'mock-access-token');

    expect(result).toBeNull();
    expect(useUserProfileStore.getState().profilesByUserId['1']).toBeUndefined();
  });
});
