/**
 * 文件说明：用户配置引导的产品导览页。
 * 复刻设计稿的三步导览流程，并在结束时标记 onboarding 完成。
 */
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
  const tourImages = [
    'https://bu.dusays.com/2026/04/26/69edad8f1e6a0.gif',
    'https://bu.dusays.com/2026/04/26/69edad8f12791.gif',
    'https://bu.dusays.com/2026/04/26/69edad90345de.gif'
  ];
  const returnTo = resolveProfileReturnTo(searchParams.get('returnTo'));
  const currentLanguage =
    appI18n.resolvedLanguage === 'en-US'
      ? 'en-US'
      : PROFILE_DEFAULT_LANGUAGE;
  const currentSlide = slides[currentStep];
  const isLastStep = currentStep === slides.length - 1;

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
            <AnimatePresence mode="wait">
              <motion.div
                key={`copy-${currentStep}`}
                className="xm-profile-onboarding__step-copy xm-profile-onboarding__step-copy--tour"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1]
                }}
              >
                <h1>{currentSlide.title}</h1>
                <p>{currentSlide.description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="xm-profile-onboarding__stack-actions xm-profile-onboarding__stack-actions--tour">
              <Button
                className="xm-profile-onboarding__primary-btn w-full shadow-md"
                size="hero"
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
                {isLastStep
                  ? t('profileSetup.tour.finish')
                  : t('profileSetup.tour.continue')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="hero"
                className="w-full text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground hover:underline"
                onClick={() => {
                  void finishTour();
                }}
              >
                {t('profileSetup.tour.skip')}
              </Button>
            </div>
          </section>

          <section className="xm-profile-onboarding__tour-demo">
            <div className="xm-profile-onboarding__tour-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`demo-${currentStep}`}
                  className="xm-profile-onboarding__tour-placeholder"
                  initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 1.02, rotate: 1.5 }}
                  transition={{
                    duration: 0.38,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                >
                  <img
                    className="xm-profile-onboarding__gif-preview"
                    src={tourImages[currentStep]}
                    alt={t('profileSetup.tour.placeholderLabel', {
                      index: currentStep + 1,
                      title: currentSlide.title
                    })}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
