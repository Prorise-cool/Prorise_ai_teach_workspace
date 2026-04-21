import { Folder } from 'lucide-react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LearningCenterRecord } from '@/types/learning-center';

type FolderOption = {
  folderId: string;
  name: string;
};

type FavoritesMoveDialogProps = {
  moveTarget: LearningCenterRecord | null;
  folderOptions: FolderOption[];
  selectedFolderId: string;
  onSelectedFolderIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function FavoritesMoveDialog({
  moveTarget,
  folderOptions,
  selectedFolderId,
  onSelectedFolderIdChange,
  onClose,
  onConfirm,
}: FavoritesMoveDialogProps) {
  const { t } = useAppTranslation();

  return (
    <Dialog
      open={Boolean(moveTarget)}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
        <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
          {t('learningCenter.favorites.moveTitle')}
        </DialogTitle>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5 line-clamp-2">
          {moveTarget?.displayTitle ?? ''}
        </p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => onSelectedFolderIdChange('')}
            className={
              selectedFolderId === ''
                ? 'w-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between shadow-sm btn-transition'
                : 'w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between btn-transition'
            }
          >
            <span className="flex items-center gap-2">
              <Folder className="w-4 h-4" /> {t('learningCenter.favorites.moveNone')}
            </span>
          </button>
          {folderOptions.map((folder) => {
            const isActive = selectedFolderId === folder.folderId;
            return (
              <button
                key={folder.folderId}
                type="button"
                onClick={() => onSelectedFolderIdChange(folder.folderId)}
                className={
                  isActive
                    ? 'w-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between shadow-sm btn-transition'
                    : 'w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between btn-transition'
                }
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4" /> {folder.name}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <button
              type="button"
              className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm"
            >
              {t('learningCenter.favorites.moveCancel')}
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm hover:opacity-90"
          >
            {t('learningCenter.favorites.moveConfirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

