/**
 * 文件说明：用户配置引导的产品导览页。
 * 复刻设计稿的三步导览流程，并在结束时标记 onboarding 完成。
 */
import { ArrowLeft, ImagePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/features/profile/hooks/use-user-profile';
import { resolveProfileReturnTo } from '@/features/profile/shared/profile-routing';
import { PROFILE_DEFAULT_LANGUAGE } from '@/features/profile/types';
import { useFeedback } from '@/shared/feedback';

import '@/features/profile/styles/profile-onboarding.scss';

/**
 * 渲染产品导览页。
 *
 * @returns 产品导览页节点。
 */
export function ProfileTourPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useFeedback();
  const { completeOnboarding, isSavingProfile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const slides = useMemo(
    () =>
      t('profileSetup.tour.slides', {
        returnObjects: true
      }) as Array<{ title: string; description: string }>,
    [t]
  );
  const returnTo = resolveProfileReturnTo(searchParams.get('returnTo'));
  const currentLanguage =
    appI18n.resolvedLanguage === 'en-US'
      ? 'en-US'
      : PROFILE_DEFAULT_LANGUAGE;
  const currentSlide = slides[currentStep];

  async function finishTour() {
    try {
      await completeOnboarding({
        language: currentLanguage
      });
      void navigate(returnTo, {
        replace: true,
        state: null
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
    <main className="xm-profile-onboarding xm-profile-onboarding--tour">
      <div className="xm-profile-onboarding__tour-shell">
        <div className="xm-profile-onboarding__tour-topbar">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="xm-profile-onboarding__topbar-back"
            data-visible={currentStep > 0}
            aria-label={t('profileSetup.tour.back')}
            onClick={() => {
              setCurrentStep(step => Math.max(step - 1, 0));
            }}
            disabled={currentStep === 0}
          >
            <ArrowLeft size={18} />
          </Button>
        </div>

        <div className="xm-profile-onboarding__tour-progress" aria-hidden="true">
          {slides.map((_, index) => (
            <span
              key={String(index)}
              className="xm-profile-onboarding__tour-dot"
              data-active={index === currentStep}
            />
          ))}
        </div>

        <div className="xm-profile-onboarding__tour-content">
          <section className="xm-profile-onboarding__tour-copy">
            <div className="xm-profile-onboarding__step-copy xm-profile-onboarding__step-copy--tour">
              <h1>{currentSlide.title}</h1>
              <p>{currentSlide.description}</p>
            </div>

            <div className="xm-profile-onboarding__stack-actions xm-profile-onboarding__stack-actions--tour">
              <Button
                className="xm-profile-onboarding__primary-btn"
                type="button"
                disabled={isSavingProfile}
                onClick={() => {
                  if (currentStep < slides.length - 1) {
                    setCurrentStep(step => step + 1);
                    return;
                  }

                  void finishTour();
                }}
              >
                {currentStep === slides.length - 1
                  ? t('profileSetup.tour.finish')
                  : t('profileSetup.tour.continue')}
              </Button>
              <button
                type="button"
                className="xm-profile-onboarding__secondary-link"
                onClick={() => {
                  void finishTour();
                }}
              >
                {t('profileSetup.tour.skip')}
              </button>
            </div>
          </section>

          <section className="xm-profile-onboarding__tour-demo">
            <div className="xm-profile-onboarding__tour-card">
              <div className="xm-profile-onboarding__tour-placeholder">
                <ImagePlus size={28} />
                <span>
                  {t('profileSetup.tour.placeholderLabel', {
                    index: currentStep + 1,
                    title: currentSlide.title
                  })}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
