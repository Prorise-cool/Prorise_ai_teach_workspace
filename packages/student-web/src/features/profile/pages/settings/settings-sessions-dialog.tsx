import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { OnlineSession } from '@/features/profile/api/online-sessions-api';

type SettingsSessionsDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  displayName: string;
  sessions: OnlineSession[];
  isLoading: boolean;
  currentTokenId: string | null;
  kickingTokenId: string | null;
  onKick: (tokenId: string) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
};

function formatLoginTime(loginTime: number | null, locale: string): string {
  if (!loginTime) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(loginTime));
  } catch {
    return '—';
  }
}

function describeSession(session: OnlineSession): string {
  const parts: string[] = [];
  if (session.browser) parts.push(session.browser);
  if (session.os) parts.push(session.os);
  if (session.ipaddr) parts.push(session.ipaddr);
  if (session.loginLocation) parts.push(session.loginLocation);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function SettingsSessionsDialog({
  open,
  onOpenChange,
  displayName,
  sessions,
  isLoading,
  currentTokenId,
  kickingTokenId,
  onKick,
  onRefresh,
  onLogout,
}: SettingsSessionsDialogProps) {
  const { t, i18n } = useAppTranslation();
  const locale = i18n.resolvedLanguage ?? 'zh-CN';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
        <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
          {t('userSettings.settings.sessionsDialogTitle')}
        </DialogTitle>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5">
          {t('userSettings.settings.sessionsDialogSubtitle')}
        </p>

        <div className="mt-5 space-y-3 max-h-[48vh] overflow-y-auto custom-scroll">
          {isLoading ? (
            <div className="bg-secondary/30 dark:bg-bg-dark/60 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl px-4 py-5 text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium text-center">
              {t('userSettings.settings.toggleSuccessTitle')}…
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-secondary/30 dark:bg-bg-dark/60 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl px-4 py-3">
              <p className="text-[13px] font-black text-text-primary dark:text-text-primary-dark">{displayName}</p>
              <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1">
                {t('userSettings.settings.sessionsCurrentHint')}
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.tokenId === currentTokenId;
              const isKickingThis = kickingTokenId === session.tokenId;
              return (
                <div
                  key={session.tokenId}
                  className="bg-secondary/30 dark:bg-bg-dark/60 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                      <span className="truncate">{session.userName ?? displayName}</span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-brand bg-brand/15 rounded-full px-2 py-[1px]">
                          {t('userSettings.settings.sessionsCurrentHint')}
                        </span>
                      )}
                    </p>
                    <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1 truncate">
                      {describeSession(session)}
                    </p>
                    <p className="text-[11px] text-text-secondary/80 dark:text-text-secondary-dark/80 font-medium mt-0.5">
                      {formatLoginTime(session.loginTime, locale)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isKickingThis}
                    onClick={() => void onKick(session.tokenId)}
                    className="shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-3 py-1.5 rounded-lg text-[12px] font-bold btn-transition shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCurrent
                      ? t('userSettings.settings.sessionsLogoutAction')
                      : t('userSettings.settings.sessionsLogoutAction')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-4 py-2 rounded-xl text-[12px] font-bold btn-transition shadow-sm disabled:opacity-50"
          >
            {t('userSettings.settings.toggleSuccessTitle')}
          </button>
          <div className="flex items-center gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm"
              >
                {t('userSettings.settings.dialogCancel')}
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={onLogout}
              className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm hover:opacity-90"
            >
              {t('userSettings.settings.sessionsLogoutAction')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
