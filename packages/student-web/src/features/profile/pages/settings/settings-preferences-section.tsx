import { ChevronDown } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type ThemeMode = 'system' | 'light' | 'dark';

type SettingsPreferencesSectionProps = {
  themeMode: ThemeMode;
  onThemeModeChange: (value: ThemeMode) => void;
  locale: 'zh-CN' | 'en-US';
  onLocaleChange: (value: 'zh-CN' | 'en-US') => void;
  notificationEnabled: boolean;
  onNotificationToggle: () => void;
};

export function SettingsPreferencesSection({
  themeMode,
  onThemeModeChange,
  locale,
  onLocaleChange,
  notificationEnabled,
  onNotificationToggle,
}: SettingsPreferencesSectionProps) {
  const { t } = useAppTranslation();

  return (
    <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-lg font-black mb-6 border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 text-text-primary dark:text-text-primary-dark">
        {t('userSettings.settings.sectionPreferences')}
      </h2>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-bordercolor-light dark:border-bordercolor-dark pb-6">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
              {t('userSettings.settings.themeTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.themeHint')}
            </p>
          </div>
          <div className="relative w-full sm:w-40 shrink-0">
            <select
              value={themeMode}
              onChange={(event) => onThemeModeChange(event.target.value as ThemeMode)}
              className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark appearance-none cursor-pointer pr-10 font-bold py-2.5"
            >
              <option value="system">{t('userSettings.settings.themeSystem')}</option>
              <option value="light">{t('userSettings.settings.themeLight')}</option>
              <option value="dark">{t('userSettings.settings.themeDark')}</option>
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-bordercolor-light dark:border-bordercolor-dark pb-6">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
              {t('userSettings.settings.localeTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.localeHint')}
            </p>
          </div>
          <div className="relative w-full sm:w-40 shrink-0">
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as 'zh-CN' | 'en-US')}
              className="form-input bg-bg-light dark:bg-bg-dark border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark appearance-none cursor-pointer pr-10 font-bold py-2.5"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
              {t('userSettings.settings.notificationsTitle')}
            </p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {t('userSettings.settings.notificationsHint')}
            </p>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notification-toggle"
              className="toggle-checkbox absolute opacity-0 w-0 h-0"
              checked={notificationEnabled}
              onChange={onNotificationToggle}
            />
            <label htmlFor="notification-toggle" className="toggle-label" />
          </div>
        </div>
      </div>
    </section>
  );
}

