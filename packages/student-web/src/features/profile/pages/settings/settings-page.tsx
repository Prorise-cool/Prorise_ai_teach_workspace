/**
 * 文件说明：设置页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：16-设置页/01-settings.html
 */
import { useEffect, useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { updateCurrentPassword } from '@/features/profile/api/account-security-api';
import { useUserProfile } from '@/features/profile/hooks/use-user-profile';
import { THEME_STORAGE_KEY } from '@/shared/constants';
import { useFeedback } from '@/shared/feedback';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import { SettingsDangerSection } from './settings-danger-section';
import { SettingsPasswordDialog, type SettingsPasswordDraft } from './settings-password-dialog';
import { SettingsPageHeader } from './settings-page-header';
import { SettingsPhoneDialog } from './settings-phone-dialog';
import { SettingsPreferencesSection } from './settings-preferences-section';
import { SettingsSecuritySection } from './settings-security-section';
import { SettingsSessionsDialog } from './settings-sessions-dialog';
import { SettingsSidebarNav } from './settings-sidebar-nav';
import {
  PASSWORD_UPDATED_AT_STORAGE_KEY,
  PHONE_STORAGE_KEY,
  normalizePhoneOrNull,
  persistStoredPhone,
  readStoredPhone,
} from './settings-utils';

type ViewLocale = 'zh-CN' | 'en-US';

export function SettingsPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const { themeMode, setThemeMode } = useThemeMode();
  const { isLoggingOut, logout } = useAuthSessionActions();
  const { profile, saveProfile } = useUserProfile();
  const session = useAuthSessionStore(state => state.session);

  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState(() =>
    readStoredPhone(typeof window === 'undefined' ? undefined : window.localStorage),
  );
  const [phoneDraft, setPhoneDraft] = useState('');

  const [passwordDraft, setPasswordDraft] = useState<SettingsPasswordDraft>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const avatarUrl = session?.user.avatarUrl ?? null;

  const localeValue = useMemo(() => {
    return appI18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  }, []);

  const [locale, setLocale] = useState<ViewLocale>(localeValue as ViewLocale);

  const updateLocale = (nextLocale: ViewLocale) => {
    setLocale(nextLocale);
    void appI18n.changeLanguage(nextLocale);
  };

  useEffect(() => {
    if (profile) {
      setNotificationEnabled(profile.notificationEnabled);
    }
  }, [profile]);

  const handleNotificationToggle = () => {
    const next = !notificationEnabled;
    setNotificationEnabled(next);
    void saveProfile({ notificationEnabled: next })
      .then(() => {
        notify({
          tone: 'success',
          title: t('userSettings.settings.toggleSuccessTitle'),
          description: next ? t('userSettings.settings.toggleOnMessage') : t('userSettings.settings.toggleOffMessage'),
        });
      })
      .catch((error: unknown) => {
        setNotificationEnabled(!next);
        notify({
          tone: 'error',
          title: t('userSettings.settings.toggleFailedTitle'),
          description: error instanceof Error ? error.message : t('userSettings.settings.toggleFailedMessage'),
        });
      });
  };

  const clearCache = () => {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.removeItem('xiaomai-profile-extras');
    window.localStorage.removeItem(PHONE_STORAGE_KEY);
    window.localStorage.removeItem(PASSWORD_UPDATED_AT_STORAGE_KEY);
    notify({
      tone: 'success',
      title: t('userSettings.settings.cacheClearedTitle'),
      description: t('userSettings.settings.cacheClearedMessage'),
    });
  };

  const handleLogout = () => {
    void logout();
  };

  const openPhoneDialog = () => {
    setPhoneDraft(phoneNumber ?? '');
    setPhoneDialogOpen(true);
  };

  const confirmPhoneUpdate = () => {
    const normalized = normalizePhoneOrNull(phoneDraft.trim());
    if (!normalized) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.phoneValidationTitle'),
        description: t('userSettings.settings.phoneValidationMessage'),
      });
      return;
    }

    persistStoredPhone(normalized);
    setPhoneNumber(normalized);
    setPhoneDialogOpen(false);
    notify({
      tone: 'success',
      title: t('userSettings.settings.phoneUpdatedTitle'),
      description: t('userSettings.settings.phoneUpdatedMessage'),
    });
  };

  const openPasswordDialog = () => {
    setPasswordDraft({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordDialogOpen(true);
  };

  const confirmPasswordUpdate = () => {
    if (!passwordDraft.oldPassword.trim()) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.passwordValidationTitle'),
        description: t('userSettings.settings.passwordOldRequired'),
      });
      return;
    }

    if (passwordDraft.newPassword.length < 6) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.passwordValidationTitle'),
        description: t('userSettings.settings.passwordTooShort'),
      });
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.passwordValidationTitle'),
        description: t('userSettings.settings.passwordMismatch'),
      });
      return;
    }

    if (isUpdatingPassword) return;

    setIsUpdatingPassword(true);
    void (async () => {
      try {
        await updateCurrentPassword({
          oldPassword: passwordDraft.oldPassword,
          newPassword: passwordDraft.newPassword,
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PASSWORD_UPDATED_AT_STORAGE_KEY, new Date().toISOString());
        }
        setPasswordDialogOpen(false);
        notify({
          tone: 'success',
          title: t('userSettings.settings.passwordUpdatedTitle'),
          description: t('userSettings.settings.passwordUpdatedMessage'),
        });
      } catch (error: unknown) {
        notify({
          tone: 'error',
          title: t('userSettings.settings.passwordUpdateFailedTitle'),
          description: error instanceof Error ? error.message : t('userSettings.settings.passwordUpdateFailedMessage'),
        });
      } finally {
        setIsUpdatingPassword(false);
      }
    })();
  };

  const displayName = session?.user.nickname ?? session?.user.username ?? '—';

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <SettingsPageHeader />

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-40 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 relative z-10">
        <SettingsSidebarNav />

        <div className="flex flex-col gap-8 view-enter stagger-2 relative">
          <div className="mb-2">
            <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
              {t('userSettings.settings.title')}
            </h1>
            <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
              {t('userSettings.settings.subtitle')}
            </p>
          </div>

          <SettingsSecuritySection
            phoneNumber={phoneNumber}
            onOpenPhoneDialog={openPhoneDialog}
            onOpenPasswordDialog={openPasswordDialog}
            onOpenSessionsDialog={() => setSessionsDialogOpen(true)}
          />

          <SettingsPreferencesSection
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            locale={locale}
            onLocaleChange={updateLocale}
            notificationEnabled={notificationEnabled}
            onNotificationToggle={handleNotificationToggle}
          />

          <SettingsDangerSection isLoggingOut={isLoggingOut} onClearCache={clearCache} onLogout={handleLogout} />
        </div>
      </main>

      <SurfaceDashboardDock active="settings" avatarUrl={avatarUrl} />

      <SettingsPhoneDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        phoneDraft={phoneDraft}
        onPhoneDraftChange={setPhoneDraft}
        onConfirm={confirmPhoneUpdate}
      />

      <SettingsPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        passwordDraft={passwordDraft}
        onPasswordFieldChange={(field, value) => setPasswordDraft((current) => ({ ...current, [field]: value }))}
        onConfirm={confirmPasswordUpdate}
      />

      <SettingsSessionsDialog
        open={sessionsDialogOpen}
        onOpenChange={setSessionsDialogOpen}
        displayName={displayName}
        onLogout={() => void logout()}
      />
    </div>
  );
}

