/**
 * 文件说明：持久化用户配置引导数据。
 * 当前用于 mock / fallback 模式持久化用户配置，并为页面提供统一缓存。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from '@/features/profile/types';
import { PROFILE_STORAGE_KEY } from '@/features/profile/types';

type UserProfileStoreState = {
  profilesByUserId: Record<string, UserProfile>;
  setProfile: (profile: UserProfile) => void;
  removeProfile: (userId: string) => void;
  clearProfiles: () => void;
};

const USER_PROFILE_INITIAL_STATE = {
  profilesByUserId: {}
} satisfies Pick<UserProfileStoreState, 'profilesByUserId'>;

export const useUserProfileStore = create<UserProfileStoreState>()(
  persist(
    set => ({
      ...USER_PROFILE_INITIAL_STATE,
      setProfile: profile =>
        set(state => ({
          profilesByUserId: {
            ...state.profilesByUserId,
            [profile.userId]: profile
          }
        })),
      removeProfile: userId =>
        set(state => {
          const nextProfiles = { ...state.profilesByUserId };
          delete nextProfiles[userId];

          return {
            profilesByUserId: nextProfiles
          };
        }),
      clearProfiles: () => set(USER_PROFILE_INITIAL_STATE)
    }),
    {
      name: PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        profilesByUserId: state.profilesByUserId
      })
    }
  )
);

/**
 * 重置本地用户配置缓存，供测试与会话排查复用。
 *
 * @returns 无返回值。
 */
export function resetUserProfileStore() {
  useUserProfileStore.setState(USER_PROFILE_INITIAL_STATE);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
}
