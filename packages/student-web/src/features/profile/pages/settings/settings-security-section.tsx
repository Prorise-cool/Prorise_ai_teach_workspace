import { useAppTranslation } from '@/app/i18n/use-app-translation';

import { maskPhone } from './settings-utils';

type SettingsSecuritySectionProps = {
  phoneNumber: string | null;
  onOpenPhoneDialog: () => void;
  onOpenPasswordDialog: () => void;
  onOpenSessionsDialog: () => void;
};

export function SettingsSecuritySection({
  phoneNumber,
  onOpenPhoneDialog,
  onOpenPasswordDialog,
  onOpenSessionsDialog,
}: SettingsSecuritySectionProps) {
  const { t } = useAppTranslation();

  return (
    <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-lg font-black mb-6 border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 text-text-primary dark:text-text-primary-dark">
        {t('userSettings.settings.sectionSecurity')}
      </h2>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-bordercolor-light dark:border-bordercolor-dark pb-6">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
              {t('userSettings.settings.phoneTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.phoneValue', { phone: maskPhone(phoneNumber) })}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPhoneDialog}
            className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
          >
            {t('userSettings.settings.phoneAction')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-bordercolor-light dark:border-bordercolor-dark pb-6">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
              {t('userSettings.settings.passwordTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.passwordHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPasswordDialog}
            className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
          >
            {t('userSettings.settings.passwordAction')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark">
                {t('userSettings.settings.sessionsTitle')}
              </p>
              <span className="px-2 py-0.5 rounded-full bg-secondary border border-bordercolor-light dark:border-bordercolor-dark text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark">
                {t('userSettings.settings.sessionsBadge')}
              </span>
            </div>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.sessionsHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSessionsDialog}
            className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
          >
            {t('userSettings.settings.sessionsAction')}
          </button>
        </div>
      </div>
    </section>
  );
}

