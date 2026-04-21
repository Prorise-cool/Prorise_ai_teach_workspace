import { Trash2 } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type SettingsDangerSectionProps = {
  isLoggingOut: boolean;
  onClearCache: () => void;
  onLogout: () => void;
};

export function SettingsDangerSection({ isLoggingOut, onClearCache, onLogout }: SettingsDangerSectionProps) {
  const { t } = useAppTranslation();

  return (
    <section className="bg-error/10 dark:bg-error/20 border border-error/30 dark:border-error/20 rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-lg font-black mb-6 text-error border-b border-error/20 dark:border-error/20 pb-4">
        {t('userSettings.settings.sectionDanger')}
      </h2>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-error/20 dark:border-error/20 pb-6">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-error mb-1.5">
              {t('userSettings.settings.clearCacheTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.clearCacheHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearCache}
            className="bg-surface-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:border-text-primary dark:hover:border-text-primary-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
          >
            {t('userSettings.settings.clearCacheAction')}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-error mb-1.5">
              {t('userSettings.settings.logoutTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.logoutHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="bg-surface-light dark:bg-bg-dark border border-error/30 dark:border-error/20 text-error hover:bg-error hover:text-white dark:hover:bg-error dark:hover:text-white px-6 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit text-center disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isLoggingOut ? t('userSettings.settings.loggingOut') : t('userSettings.settings.logoutAction')}
          </button>
        </div>
      </div>
    </section>
  );
}

