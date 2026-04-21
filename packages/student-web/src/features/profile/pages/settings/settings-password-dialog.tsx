import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAppTranslation } from '@/app/i18n/use-app-translation';

export type SettingsPasswordDraft = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SettingsPasswordDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  passwordDraft: SettingsPasswordDraft;
  onPasswordFieldChange: (field: keyof SettingsPasswordDraft, value: string) => void;
  onConfirm: () => void;
};

export function SettingsPasswordDialog({
  open,
  onOpenChange,
  passwordDraft,
  onPasswordFieldChange,
  onConfirm,
}: SettingsPasswordDialogProps) {
  const { t } = useAppTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
        <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
          {t('userSettings.settings.passwordDialogTitle')}
        </DialogTitle>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5">
          {t('userSettings.settings.passwordDialogSubtitle')}
        </p>
        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={passwordDraft.oldPassword}
            onChange={(event) => onPasswordFieldChange('oldPassword', event.target.value)}
            className="w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-3 rounded-xl text-[13px] font-bold shadow-sm outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder={t('userSettings.settings.passwordOldPlaceholder')}
          />
          <input
            type="password"
            value={passwordDraft.newPassword}
            onChange={(event) => onPasswordFieldChange('newPassword', event.target.value)}
            className="w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-3 rounded-xl text-[13px] font-bold shadow-sm outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder={t('userSettings.settings.passwordNewPlaceholder')}
          />
          <input
            type="password"
            value={passwordDraft.confirmPassword}
            onChange={(event) => onPasswordFieldChange('confirmPassword', event.target.value)}
            className="w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-3 rounded-xl text-[13px] font-bold shadow-sm outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder={t('userSettings.settings.passwordConfirmPlaceholder')}
          />
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
            onClick={onConfirm}
            className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm hover:opacity-90"
          >
            {t('userSettings.settings.dialogConfirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

