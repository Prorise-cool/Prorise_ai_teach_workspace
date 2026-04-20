/**
 * 文件说明：设置页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：16-设置页/01-settings.html
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Leaf,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { FAVORITES_FOLDER_STORAGE_KEY } from '@/features/learning-center/stores/favorites-folder-store';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { THEME_STORAGE_KEY } from '@/shared/constants';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';

const NOTIFICATION_STORAGE_KEY = 'xiaomai-notification-enabled';

function readNotificationPreference(storage: Storage | undefined) {
  if (!storage) return true;
  const raw = storage.getItem(NOTIFICATION_STORAGE_KEY);
  if (raw === 'N') return false;
  if (raw === 'Y') return true;
  return true;
}

function persistNotificationPreference(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, enabled ? 'Y' : 'N');
}

export function SettingsPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const { themeMode, setThemeMode } = useThemeMode();
  const { isLoggingOut, logout } = useAuthSessionActions();
  const session = useAuthSessionStore(state => state.session);

  const [notificationEnabled, setNotificationEnabled] = useState(() =>
    readNotificationPreference(typeof window === 'undefined' ? undefined : window.localStorage),
  );

  const avatarUrl = session?.user.avatarUrl ?? null;

  const localeValue = useMemo(() => {
    return appI18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  }, []);

  const [locale, setLocale] = useState<'zh-CN' | 'en-US'>(localeValue as 'zh-CN' | 'en-US');

  const updateLocale = (nextLocale: 'zh-CN' | 'en-US') => {
    setLocale(nextLocale);
    void appI18n.changeLanguage(nextLocale);
  };

  const handleNotificationToggle = () => {
    const next = !notificationEnabled;
    setNotificationEnabled(next);
    persistNotificationPreference(next);
    notify({
      tone: 'success',
      title: t('userSettings.settings.toggleSuccessTitle'),
      description: next ? t('userSettings.settings.toggleOnMessage') : t('userSettings.settings.toggleOffMessage'),
    });
  };

  const clearCache = () => {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    window.localStorage.removeItem('xiaomai-profile-extras');
    window.localStorage.removeItem(FAVORITES_FOLDER_STORAGE_KEY);
    notify({
      tone: 'success',
      title: t('userSettings.settings.cacheClearedTitle'),
      description: t('userSettings.settings.cacheClearedMessage'),
    });
  };

  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
        <Link
          to="/"
          className="font-bold text-lg flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block text-xl">
            XiaoMai
          </span>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
          <Link
            to="/learning"
            className="bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm border border-bordercolor-light dark:border-bordercolor-dark btn-transition hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">{t('learningCenter.page.backToLearning')}</span>
          </Link>
        </div>
      </header>

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-40 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 relative z-10">
        <aside className="flex flex-col gap-2 view-enter stagger-1 lg:sticky lg:top-24 self-start">
          <h2 className="text-[11px] font-black tracking-widest text-text-secondary dark:text-text-secondary-dark mb-3 px-4 uppercase">
            User Settings
          </h2>

          <div className="flex flex-col gap-1">
            <Link
              to="/profile"
              className="border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex items-center gap-2.5 btn-transition"
            >
              <User className="w-4 h-4" /> {t('userSettings.settings.navProfile')}
            </Link>

            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center transition-colors shadow-sm">
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" /> {t('userSettings.settings.navSettings')}
              </span>
            </div>
          </div>
        </aside>

        <div className="flex flex-col gap-8 view-enter stagger-2 relative">
          <div className="mb-2">
            <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
              {t('userSettings.settings.title')}
            </h1>
            <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
              {t('userSettings.settings.subtitle')}
            </p>
          </div>

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
                    {t('userSettings.settings.phoneValue')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify({
                      tone: 'info',
                      title: t('userSettings.settings.comingSoonTitle'),
                      description: t('userSettings.settings.comingSoonMessage'),
                    })
                  }
                  className="bg-secondary dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
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
                  onClick={() =>
                    notify({
                      tone: 'info',
                      title: t('userSettings.settings.comingSoonTitle'),
                      description: t('userSettings.settings.comingSoonMessage'),
                    })
                  }
                  className="bg-secondary dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
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
                    <span className="px-2 py-0.5 rounded-full bg-secondary dark:bg-[#2c2522] border border-bordercolor-light dark:border-bordercolor-dark text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark">
                      {t('userSettings.settings.sessionsBadge')}
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
                    {t('userSettings.settings.sessionsHint')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify({
                      tone: 'info',
                      title: t('userSettings.settings.comingSoonTitle'),
                      description: t('userSettings.settings.comingSoonMessage'),
                    })
                  }
                  className="bg-secondary dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
                >
                  {t('userSettings.settings.sessionsAction')}
                </button>
              </div>
            </div>
          </section>

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
                    onChange={(event) => setThemeMode(event.target.value as typeof themeMode)}
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
                    onChange={(event) => updateLocale(event.target.value as 'zh-CN' | 'en-US')}
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
                    onChange={handleNotificationToggle}
                  />
                  <label htmlFor="notification-toggle" className="toggle-label" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#fff1f0] dark:bg-[#2c1515] border border-error/30 dark:border-error/20 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black mb-6 text-error dark:text-[#ff4d4f] border-b border-error/20 dark:border-error/20 pb-4">
              {t('userSettings.settings.sectionDanger')}
            </h2>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-error/20 dark:border-error/20 pb-6">
                <div>
                  <p className="text-[14px] font-bold text-text-primary dark:text-[#ff4d4f] mb-1.5">
                    {t('userSettings.settings.clearCacheTitle')}
                  </p>
                  <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
                    {t('userSettings.settings.clearCacheHint')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearCache}
                  className="bg-surface-light dark:bg-[#1a1614] border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:border-text-primary dark:hover:border-text-primary-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit"
                >
                  {t('userSettings.settings.clearCacheAction')}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-bold text-text-primary dark:text-[#ff4d4f] mb-1.5">
                    {t('userSettings.settings.logoutTitle')}
                  </p>
                  <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium">
                    {t('userSettings.settings.logoutHint')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-surface-light dark:bg-[#1a1614] border border-error dark:border-[#bf0004] text-error dark:text-[#ff4d4f] hover:bg-error hover:text-white dark:hover:bg-[#bf0004] dark:hover:text-white px-6 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm whitespace-nowrap w-fit text-center disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isLoggingOut ? t('userSettings.settings.loggingOut') : t('userSettings.settings.logoutAction')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SurfaceDashboardDock active="settings" avatarUrl={avatarUrl} />
    </div>
  );
}
