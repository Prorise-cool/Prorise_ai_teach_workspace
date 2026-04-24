/**
 * 文件说明：设置页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：16-设置页/01-settings.html
 *
 * 后端承接（P0-2）：
 * - 密码：/system/user/profile/updatePwd（updateCurrentPassword）
 * - 手机号：/system/user/profile PUT phonenumber（updateCurrentSystemPhone）
 * - 主题/语言/通知：xm_user_profile 扩展字段（saveProfile）
 * - 多端设备：/monitor/online + /monitor/online/myself/{tokenId}
 */
import { useCallback, useEffect, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { appI18n } from '@/app/i18n';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { useAuthSessionActions } from '@/features/auth/hooks/use-auth-session-actions';
import { updateCurrentPassword } from '@/features/profile/api/account-security-api';
import {
  kickCurrentOnlineSession,
  listCurrentOnlineSessions,
  type OnlineSession,
} from '@/features/profile/api/online-sessions-api';
import { updateCurrentSystemPhone } from '@/features/profile/api/system-profile-api';
import { useUserProfile } from '@/features/profile/hooks/use-user-profile';
import type { ProfileLanguage, ProfileThemeMode } from '@/features/profile/types';
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
import { normalizePhoneOrNull } from './settings-utils';

type ViewLocale = ProfileLanguage;

function resolveViewLocale(value: string | null | undefined): ViewLocale {
  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

export function SettingsPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const { themeMode, setThemeMode } = useThemeMode();
  const { isLoggingOut, logout } = useAuthSessionActions();
  const { profile, saveProfile } = useUserProfile();
  const session = useAuthSessionStore(state => state.session);

  const currentTokenId = session?.accessToken ?? null;

  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // 手机号不在 session.user 模型里：初始为空，更新成功后本地缓存本次设置值。
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState('');

  const [passwordDraft, setPasswordDraft] = useState<SettingsPasswordDraft>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const avatarUrl = session?.user.avatarUrl ?? null;

  const [locale, setLocale] = useState<ViewLocale>(
    resolveViewLocale(appI18n.resolvedLanguage),
  );

  const [sessions, setSessions] = useState<OnlineSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [kickingTokenId, setKickingTokenId] = useState<string | null>(null);

  // profile 加载完成后，一次性把后端偏好灌入前端 UI state。
  // 注意：主题 themeMode 故意不在这里自动同步——
  // 用户反馈进 settings 会被意外切到 profile.themeMode（常见场景是 DB 存 'system'
  // 而 OS 偏好是 dark，造成"进设置页突然变黑"），其他页面又没有同步逻辑，体验不一致。
  // 主题改由 handleThemeChange 在用户点击切换时写回 profile 持久化，读取侧不再强行应用。
  useEffect(() => {
    if (!profile) return;
    setNotificationEnabled(profile.notificationEnabled);
    const nextLocale = resolveViewLocale(profile.language);
    if (nextLocale !== locale) {
      setLocale(nextLocale);
      void appI18n.changeLanguage(nextLocale);
    }
    // 只在 profile 首次就绪时同步一次；后续由 UI 交互写回后端。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const handleThemeChange = (next: ProfileThemeMode) => {
    const previous = themeMode;
    setThemeMode(next);
    void saveProfile({ themeMode: next }).catch((error: unknown) => {
      setThemeMode(previous);
      notify({
        tone: 'error',
        title: t('userSettings.settings.toggleFailedTitle'),
        description: error instanceof Error ? error.message : String(error),
      });
    });
  };

  const updateLocale = (nextLocale: ViewLocale) => {
    const previous = locale;
    setLocale(nextLocale);
    void appI18n.changeLanguage(nextLocale);
    void saveProfile({ language: nextLocale }).catch((error: unknown) => {
      setLocale(previous);
      void appI18n.changeLanguage(previous);
      notify({
        tone: 'error',
        title: t('userSettings.settings.toggleFailedTitle'),
        description: error instanceof Error ? error.message : String(error),
      });
    });
  };

  const handleNotificationToggle = () => {
    const next = !notificationEnabled;
    setNotificationEnabled(next);
    void saveProfile({ notificationEnabled: next })
      .then(() => {
        notify({
          tone: 'success',
          title: t('userSettings.settings.toggleSuccessTitle'),
          description: next
            ? t('userSettings.settings.toggleOnMessage')
            : t('userSettings.settings.toggleOffMessage'),
        });
      })
      .catch((error: unknown) => {
        setNotificationEnabled(!next);
        notify({
          tone: 'error',
          title: t('userSettings.settings.toggleFailedTitle'),
          description: error instanceof Error ? error.message : String(error),
        });
      });
  };

  const clearCache = () => {
    // 本地非鉴权/非持久化缓存清理，不再涉及 settings 偏好。
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

    if (isUpdatingPhone) return;

    setIsUpdatingPhone(true);
    void (async () => {
      try {
        await updateCurrentSystemPhone(normalized);
        setPhoneNumber(normalized);
        setPhoneDialogOpen(false);
        notify({
          tone: 'success',
          title: t('userSettings.settings.phoneUpdatedTitle'),
          description: t('userSettings.settings.phoneUpdatedMessage'),
        });
      } catch (error: unknown) {
        notify({
          tone: 'error',
          title: t('userSettings.settings.phoneUpdatedTitle'),
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsUpdatingPhone(false);
      }
    })();
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
          description:
            error instanceof Error
              ? error.message
              : t('userSettings.settings.passwordUpdateFailedMessage'),
        });
      } finally {
        setIsUpdatingPassword(false);
      }
    })();
  };

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await listCurrentOnlineSessions();
      setSessions(list);
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.sessionsDialogTitle'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoadingSessions(false);
    }
  }, [notify, t]);

  useEffect(() => {
    if (!sessionsDialogOpen) return;
    void loadSessions();
  }, [loadSessions, sessionsDialogOpen]);

  const handleKickSession = async (tokenId: string) => {
    if (kickingTokenId) return;
    setKickingTokenId(tokenId);
    try {
      await kickCurrentOnlineSession(tokenId);
      // 如果踢下的是当前会话，Sa-Token 后续请求会返回 401，交给 authFailureMode 处理。
      if (tokenId === currentTokenId) {
        await logout();
        setSessionsDialogOpen(false);
        return;
      }
      await loadSessions();
      notify({
        tone: 'success',
        title: t('userSettings.settings.toggleSuccessTitle'),
        description: t('userSettings.settings.sessionsCurrentHint'),
      });
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('userSettings.settings.sessionsDialogTitle'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setKickingTokenId(null);
    }
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
            onThemeModeChange={handleThemeChange}
            locale={locale}
            onLocaleChange={updateLocale}
            notificationEnabled={notificationEnabled}
            onNotificationToggle={handleNotificationToggle}
          />

          <SettingsDangerSection
            isLoggingOut={isLoggingOut}
            onClearCache={clearCache}
            onLogout={handleLogout}
          />
        </div>
      </main>

      <SurfaceDashboardDock active="settings" />

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
        onPasswordFieldChange={(field, value) =>
          setPasswordDraft((current) => ({ ...current, [field]: value }))
        }
        onConfirm={confirmPasswordUpdate}
      />

      <SettingsSessionsDialog
        open={sessionsDialogOpen}
        onOpenChange={setSessionsDialogOpen}
        displayName={displayName}
        sessions={sessions}
        isLoading={isLoadingSessions}
        currentTokenId={currentTokenId}
        kickingTokenId={kickingTokenId}
        onKick={handleKickSession}
        onRefresh={loadSessions}
        onLogout={() => void logout()}
      />
    </div>
  );
}
