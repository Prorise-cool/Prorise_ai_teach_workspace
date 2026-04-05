/**
 * 文件说明：封装用户配置的查询、保存与完成引导动作。
 * 页面只关心当前 profile 状态和提交动作，不直接散落 adapter 细节。
 */
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { profileApi } from '@/features/profile/api/profile-api';
import { useUserProfileStore } from '@/features/profile/stores/user-profile-store';
import type { SaveUserProfileInput } from '@/features/profile/types';
import { useAuthSessionStore } from '@/stores/auth-session-store';

/**
 * 提供当前登录用户的 profile 查询与写入动作。
 *
 * @returns 用户配置查询状态、当前 profile 与保存方法。
 */
export function useUserProfile() {
  const session = useAuthSessionStore(state => state.session);
  const setProfile = useUserProfileStore(state => state.setProfile);
  const removeProfile = useUserProfileStore(state => state.removeProfile);
  const profilesByUserId = useUserProfileStore(state => state.profilesByUserId);

  const userId = session?.user.id ?? '';
  const accessToken = session?.accessToken;
  const cachedProfile = userId ? profilesByUserId[userId] ?? null : null;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    retry: 1,
    queryFn: async () => profileApi.getCurrentProfile(userId, accessToken)
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data, setProfile]);

  const saveProfileMutation = useMutation({
    mutationFn: async (input: SaveUserProfileInput) => {
      if (!userId) {
        throw new Error('当前未登录，无法保存用户配置');
      }

      return profileApi.saveProfile(userId, input, accessToken);
    },
    onSuccess: profile => {
      setProfile(profile);
    }
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (input: SaveUserProfileInput = {}) => {
      if (!userId) {
        throw new Error('当前未登录，无法完成用户配置');
      }

      return profileApi.saveProfile(
        userId,
        {
          ...input,
          isCompleted: true
        },
        accessToken
      );
    },
    onSuccess: profile => {
      setProfile(profile);
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accessToken) {
        throw new Error('当前未登录，无法上传头像');
      }

      return profileApi.uploadAvatar(file, accessToken);
    }
  });

  return {
    userId,
    profile: cachedProfile ?? profileQuery.data ?? null,
    isLoadingProfile: profileQuery.isLoading,
    profileError: profileQuery.error,
    refetchProfile: profileQuery.refetch,
    saveProfile: saveProfileMutation.mutateAsync,
    completeOnboarding: completeProfileMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    isSavingProfile:
      saveProfileMutation.isPending || completeProfileMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    clearProfile: () => {
      if (!userId) {
        return;
      }

      removeProfile(userId);
    }
  };
}
