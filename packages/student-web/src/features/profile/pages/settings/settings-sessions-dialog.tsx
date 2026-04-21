import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAppTranslation } from '@/app/i18n/use-app-translation';

type SettingsSessionsDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  displayName: string;
  onLogout: () => void;
};

export function SettingsSessionsDialog({
  open,
  onOpenChange,
  displayName,
  onLogout,
}: SettingsSessionsDialogProps) {
  const { t } = useAppTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
        <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
          {t('userSettings.settings.sessionsDialogTitle')}
        </DialogTitle>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5">
          {t('userSettings.settings.sessionsDialogSubtitle')}
        </p>
        <div className="mt-5 space-y-3">
          <div className="bg-secondary/30 dark:bg-bg-dark/60 border border-bordercolor-light dark:border-bordercolor-dark rounded-xl px-4 py-3">
            <p className="text-[13px] font-black text-text-primary dark:text-text-primary-dark">{displayName}</p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1">
              {t('userSettings.settings.sessionsCurrentHint')}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
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
      </DialogContent>
    </Dialog>
  );
}

