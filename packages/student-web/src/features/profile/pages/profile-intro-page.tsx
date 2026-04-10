/**
 * 文件说明：用户配置引导的个人简介页。
 * 复刻认证页第三视图，收集头像与个人简介，并决定是否进入偏好收集页。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, MoonStar, SunMedium } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AuthScene } from '@/shared/auth-ui';
import { useAuthPageUiState } from '@/shared/auth-ui';
import { useAuthPageCopy } from '@/shared/auth-ui';
import { useUserProfile } from '@/features/profile/hooks/use-user-profile';
import {
  createProfileIntroSchema,
  type ProfileIntroFormValues
} from '@/features/profile/schemas/profile-form-schemas';
import {
  buildProfilePreferencesPath,
  buildProfileTourPath
} from '@/features/profile/shared/profile-routing';
import {
  hasCollectedProfilePreferences,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DEFAULT_LANGUAGE
} from '@/features/profile/types';
import { useFeedback } from '@/shared/feedback';

import '@/features/auth/styles/login-page.scss';
import '@/features/profile/styles/profile-onboarding.scss';

/**
 * 渲染用户配置引导的个人简介页。
 *
 * @returns 个人简介页节点。
 */
export function ProfileIntroPage() {
  const { t } = useAppTranslation();
  const authPageCopy = useAuthPageCopy();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useFeedback();
  const { themeMode, scenePhase, toggleThemeMode } = useAuthPageUiState();
  const {
    userId,
    profile,
    saveProfile,
    uploadAvatar,
    isSavingProfile,
    isUploadingAvatar
  } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatarUrl ?? null
  );
  const returnTo = searchParams.get('returnTo') ?? undefined;
  const currentLanguage =
    appI18n.resolvedLanguage === 'en-US'
      ? 'en-US'
      : PROFILE_DEFAULT_LANGUAGE;
  const defaultValues = useMemo<ProfileIntroFormValues>(
    () => ({
      bio: profile?.bio ?? ''
    }),
    [profile?.bio]
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch
  } = useForm<ProfileIntroFormValues>({
    resolver: zodResolver(createProfileIntroSchema(t)),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });
  const bioValue = watch('bio');

  useEffect(() => {
    reset(defaultValues);
    setAvatarPreview(profile?.avatarUrl ?? null);
  }, [defaultValues, profile?.avatarUrl, reset]);

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    if (!userId) {
      notify({
        tone: 'warning',
        title: t('profileSetup.feedback.saveFailedTitle'),
        description: t('profileSetup.feedback.missingSession')
      });
      event.target.value = '';
      return;
    }

    try {
      const uploadedAvatarUrl = await uploadAvatar(nextFile);
      setAvatarPreview(uploadedAvatarUrl);
    } catch {
      notify({
        tone: 'warning',
        title: t('profileSetup.feedback.saveFailedTitle'),
        description: t('profileSetup.feedback.avatarReadFailed')
      });
    } finally {
      event.target.value = '';
    }
  }

  const submitForm = handleSubmit(async values => {
    if (!userId) {
      notify({
        tone: 'warning',
        title: t('profileSetup.feedback.saveFailedTitle'),
        description: t('profileSetup.feedback.missingSession')
      });
      return;
    }

    try {
      const nextProfile = await saveProfile({
        avatarUrl: avatarPreview,
        bio: values.bio,
        language: currentLanguage
      });

      const hasProfilePreferences = hasCollectedProfilePreferences(nextProfile);

      void navigate(
        hasProfilePreferences
          ? buildProfileTourPath(returnTo)
          : buildProfilePreferencesPath(returnTo),
        {
          replace: true
        }
      );
    } catch {
      notify({
        tone: 'warning',
        title: t('profileSetup.feedback.saveFailedTitle'),
        description: t('profileSetup.feedback.saveFailedMessage')
      });
    }
  });

  return (
    <main className="xm-auth-page xm-profile-onboarding xm-profile-onboarding--intro">
      <div className="xm-auth-container xm-profile-onboarding__intro-shell">
        <AuthScene phase={scenePhase} />

        <section className="xm-auth-right-panel xm-profile-onboarding__intro-panel">
          <div className="xm-auth-brand-header xm-profile-onboarding__brand-row">
            <span className="xm-auth-brand-icon xm-profile-onboarding__brand-mark" aria-hidden="true">
              <img src="/entry/logo.png" alt="" className="xm-auth-brand-logo xm-profile-onboarding__brand-logo" />
            </span>
            <span>{authPageCopy.brand}</span>
          </div>
          <div className="xm-auth-toolbar xm-profile-onboarding__toolbar">
            <Button
              type="button"
              variant="surface"
              size="icon"
              className="xm-auth-icon-btn xm-profile-onboarding__theme-btn"
              aria-label={t('profileSetup.intro.themeToggle')}
              onClick={toggleThemeMode}
            >
              {themeMode === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </Button>
          </div>

          <button
            type="button"
            className="xm-profile-onboarding__skip-link"
            onClick={() => {
              void navigate(buildProfileTourPath(returnTo), {
                replace: true
              });
            }}
          >
            {t('profileSetup.intro.skip')}
          </button>

          <h1 className="xm-auth-view-title xm-profile-onboarding__intro-title">
            {t('profileSetup.intro.title')}
          </h1>
          <p className="xm-auth-view-subtitle xm-profile-onboarding__intro-subtitle">
            {t('profileSetup.intro.subtitle')}
          </p>

          <form
            className="xm-profile-onboarding__intro-form"
            noValidate
            onSubmit={event => {
              void submitForm(event);
            }}
          >
            <div className="xm-profile-onboarding__avatar-block">
              <input
                ref={fileInputRef}
                className="xm-profile-onboarding__hidden-input"
                type="file"
                accept="image/*"
                onChange={event => {
                  void handleAvatarChange(event);
                }}
              />
              <button
                type="button"
                className="xm-profile-onboarding__avatar-trigger"
                disabled={isUploadingAvatar}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt=""
                    className="xm-profile-onboarding__avatar-image"
                  />
                ) : (
                  <span className="xm-profile-onboarding__avatar-placeholder">
                    {t('profileSetup.intro.avatarPlaceholder')}
                  </span>
                )}
                <span className="xm-profile-onboarding__avatar-camera" aria-hidden="true">
                  <Camera size={18} />
                </span>
              </button>
              <div className="xm-profile-onboarding__avatar-copy">
                <strong>{t('profileSetup.intro.avatarLabel')}</strong>
                <span>
                  {isUploadingAvatar
                    ? t('profileSetup.intro.avatarUploading')
                    : t('profileSetup.intro.avatarHint')}
                </span>
              </div>
            </div>

            <div className="xm-profile-onboarding__field-group">
              <div className="xm-profile-onboarding__field-header">
                <Label htmlFor="profile-bio">{t('profileSetup.intro.bioLabel')}</Label>
                <span>
                  {t('profileSetup.intro.countLabel', {
                    count: bioValue.length,
                    max: PROFILE_BIO_MAX_LENGTH
                  })}
                </span>
              </div>
              <Textarea
                id="profile-bio"
                {...register('bio')}
                className="xm-profile-onboarding__bio-input"
                placeholder={t('profileSetup.intro.bioPlaceholder')}
                maxLength={PROFILE_BIO_MAX_LENGTH}
              />
              <p className="xm-profile-onboarding__field-hint">
                {t('profileSetup.intro.bioHelper')}
              </p>
              {errors.bio?.message ? (
                <p className="xm-profile-onboarding__field-error" role="alert">
                  {errors.bio.message}
                </p>
              ) : null}
            </div>

            <Button
              className="w-full rounded-full shadow-md"
              size="hero"
              type="submit"
              disabled={isSavingProfile}
            >
              {t('profileSetup.intro.next')}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
