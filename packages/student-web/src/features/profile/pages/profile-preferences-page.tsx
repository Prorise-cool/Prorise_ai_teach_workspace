/**
 * 文件说明：用户配置引导的偏好收集页。
 * 两步收集性格类型与 AI 导师偏好，复刻设计稿中的列表 + pill 交互。
 */
import {
  ArrowLeft,
  BookOpenText,
  BrainCircuit,
  BrushCleaning,
  Crosshair,
  Flame,
  HeartHandshake,
  MessageCircleMore,
  Orbit,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsUp,
  UserRoundPlus
} from 'lucide-react';
import { type ComponentType, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/features/profile/hooks/use-user-profile';
import {
  buildProfileSetupPath,
  buildProfileTourPath
} from '@/features/profile/shared/profile-routing';
import {
  PROFILE_DEFAULT_LANGUAGE,
  type PersonalityType,
  type TeacherTag
} from '@/features/profile/types';
import { useFeedback } from '@/shared/feedback';

import '@/features/profile/styles/profile-onboarding.scss';

const PERSONALITY_OPTION_META: Array<{
  value: PersonalityType;
  icon: ComponentType<{ size?: number }>;
}> = [
  {
    value: 'action_oriented',
    icon: Crosshair
  },
  {
    value: 'explorer',
    icon: Search
  },
  {
    value: 'methodological',
    icon: BookOpenText
  },
  {
    value: 'social',
    icon: MessageCircleMore
  },
  {
    value: 'creative',
    icon: Palette
  }
];

const TEACHER_TAG_META: Array<{
  value: TeacherTag;
  icon: ComponentType<{ size?: number }>;
}> = [
  { value: 'humorous', icon: Sparkles },
  { value: 'logical', icon: BrainCircuit },
  { value: 'imaginative', icon: BrushCleaning },
  { value: 'strict', icon: ShieldCheck },
  { value: 'patient', icon: HeartHandshake },
  { value: 'friendly', icon: UserRoundPlus },
  { value: 'direct', icon: Target },
  { value: 'knowledgeable', icon: BookOpenText },
  { value: 'encouraging', icon: ThumbsUp },
  { value: 'interactive', icon: MessageCircleMore },
  { value: 'calm', icon: Orbit },
  { value: 'passionate', icon: Flame }
];

/**
 * 渲染两步偏好收集页。
 *
 * @returns 偏好收集页节点。
 */
export function ProfilePreferencesPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useFeedback();
  const { profile, saveProfile, isSavingProfile } = useUserProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType | null>(null);
  const [selectedTags, setSelectedTags] = useState<TeacherTag[] | null>(null);
  const returnTo = searchParams.get('returnTo') ?? undefined;
  const currentLanguage =
    appI18n.resolvedLanguage === 'en-US'
      ? 'en-US'
      : PROFILE_DEFAULT_LANGUAGE;
  const effectiveSelectedPersonality = selectedPersonality ?? profile?.personalityType ?? null;
  const effectiveSelectedTags = selectedTags ?? profile?.teacherTags ?? [];

  const personalityOptions = useMemo(
    () =>
      PERSONALITY_OPTION_META.map(option => ({
        ...option,
        label: t(`profileSetup.personality.${option.value}.label`)
      })),
    [t]
  );
  const teacherTagOptions = useMemo(
    () =>
      TEACHER_TAG_META.map(option => ({
        ...option,
        label: t(`profileSetup.teacherTags.${option.value}`)
      })),
    [t]
  );

  async function handleContinueToTour() {
    try {
      await saveProfile({
        personalityType: effectiveSelectedPersonality,
        teacherTags: effectiveSelectedTags,
        language: currentLanguage
      });

      void navigate(buildProfileTourPath(returnTo), {
        replace: true
      });
    } catch {
      notify({
        tone: 'warning',
        title: t('profileSetup.feedback.saveFailedTitle'),
        description: t('profileSetup.feedback.saveFailedMessage')
      });
    }
  }

  return (
    <main className="xm-profile-onboarding xm-profile-onboarding--preferences">
      <div className="xm-profile-onboarding__surface">
        <div className="xm-profile-onboarding__topbar">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="xm-profile-onboarding__topbar-back"
            data-visible={stepIndex > 0}
            aria-label={t('profileSetup.preferences.introBack')}
            onClick={() => {
              if (stepIndex > 0) {
                setStepIndex(currentStep => currentStep - 1);
                return;
              }

              void navigate(buildProfileSetupPath(returnTo));
            }}
          >
            <ArrowLeft size={18} />
          </Button>
        </div>

        <div className="xm-profile-onboarding__preferences-progress" aria-hidden="true">
          {[0, 1].map(index => (
            <span
              key={String(index)}
              className="xm-profile-onboarding__preferences-dot"
              data-active={index === stepIndex}
            />
          ))}
        </div>

        {stepIndex === 0 ? (
          <section className="xm-profile-onboarding__preferences-step">
            <div className="xm-profile-onboarding__step-copy">
              <h1>{t('profileSetup.preferences.titleStep1')}</h1>
              <p>{t('profileSetup.preferences.subtitleStep1')}</p>
            </div>

            <div className="xm-profile-onboarding__personality-list">
              {personalityOptions.map(option => {
                const Icon = option.icon;
                const isActive = effectiveSelectedPersonality === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="xm-profile-onboarding__personality-option"
                    data-active={isActive}
                    onClick={() => {
                      setSelectedPersonality(option.value);
                    }}
                  >
                    <span className="xm-profile-onboarding__personality-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="xm-profile-onboarding__stack-actions">
              <Button
                className="xm-profile-onboarding__primary-btn"
                type="button"
                disabled={!effectiveSelectedPersonality}
                onClick={() => {
                  setStepIndex(1);
                }}
              >
                {t('profileSetup.preferences.next')}
              </Button>
              <button
                type="button"
                className="xm-profile-onboarding__secondary-link"
                onClick={() => {
                  void navigate(buildProfileTourPath(returnTo), {
                    replace: true
                  });
                }}
              >
                {t('profileSetup.preferences.skip')}
              </button>
            </div>
          </section>
        ) : (
          <section className="xm-profile-onboarding__preferences-step">
            <div className="xm-profile-onboarding__step-copy">
              <h1>{t('profileSetup.preferences.titleStep2')}</h1>
              <p>{t('profileSetup.preferences.subtitleStep2')}</p>
            </div>

            <div className="xm-profile-onboarding__teacher-tags">
              {teacherTagOptions.map(option => {
                const Icon = option.icon;
                const isActive = effectiveSelectedTags.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className="xm-profile-onboarding__teacher-tag"
                    data-active={isActive}
                    onClick={() => {
                      setSelectedTags(currentTags =>
                        (currentTags ?? effectiveSelectedTags).includes(option.value)
                          ? (currentTags ?? effectiveSelectedTags).filter(
                              tag => tag !== option.value
                            )
                          : [...(currentTags ?? effectiveSelectedTags), option.value]
                      );
                    }}
                  >
                    <Icon size={16} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="xm-profile-onboarding__stack-actions">
              <Button
                className="xm-profile-onboarding__primary-btn"
                type="button"
                disabled={isSavingProfile}
                onClick={() => {
                  void handleContinueToTour();
                }}
              >
                {t('profileSetup.preferences.continue')}
              </Button>
              <button
                type="button"
                className="xm-profile-onboarding__secondary-link"
                onClick={() => {
                  void navigate(buildProfileTourPath(returnTo), {
                    replace: true
                  });
                }}
              >
                {t('profileSetup.preferences.skip')}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
