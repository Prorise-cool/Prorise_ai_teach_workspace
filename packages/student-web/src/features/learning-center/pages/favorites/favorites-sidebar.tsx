import { Folder, FolderPlus, Star } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type FolderOption = {
  folderId: string;
  name: string;
};

type FavoritesSidebarProps = {
  activeFolderId: 'all' | string;
  total: number;
  folderOptions: FolderOption[];
  folderCounts: Map<string, number>;
  onSelectFolder: (folderId: 'all' | string) => void;
  onOpenCreateFolder: () => void;
};

export function FavoritesSidebar({
  activeFolderId,
  total,
  folderOptions,
  folderCounts,
  onSelectFolder,
  onOpenCreateFolder,
}: FavoritesSidebarProps) {
  const { t } = useAppTranslation();

  return (
    <aside className="flex flex-col gap-4 view-enter stagger-1 lg:sticky lg:top-24 self-start">
      <div className="flex justify-between items-center px-4 mb-2">
        <h2 className="text-[11px] font-black tracking-widest text-text-secondary dark:text-text-secondary-dark uppercase">
          My Folders
        </h2>
        <button
          type="button"
          onClick={onOpenCreateFolder}
          className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary dark:hover:bg-bg-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition"
          title={t('learningCenter.favorites.createFolder')}
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onSelectFolder('all')}
          className={
            activeFolderId === 'all'
              ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center shadow-sm btn-transition'
              : 'border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center btn-transition'
          }
        >
          <span className="flex items-center gap-2.5">
            <Star className="w-4 h-4 fill-surface-light dark:fill-surface-dark" /> {t('learningCenter.favorites.all')}
          </span>
          <span
            className={
              activeFolderId === 'all'
                ? 'text-[10px] font-black bg-surface-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm'
                : 'text-[11px] font-bold'
            }
          >
            {total}
          </span>
        </button>

        {folderOptions.map((folder) => {
          const count = folderCounts.get(folder.folderId) ?? 0;
          const isActive = activeFolderId === folder.folderId;
          return (
            <button
              key={folder.folderId}
              type="button"
              onClick={() => onSelectFolder(folder.folderId)}
              className={
                isActive
                  ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center shadow-sm btn-transition'
                  : 'border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center btn-transition'
              }
            >
              <span className="flex items-center gap-2.5">
                <Folder className="w-4 h-4" /> {folder.name}
              </span>
              <span
                className={
                  isActive
                    ? 'text-[10px] font-black bg-surface-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm'
                    : 'text-[11px] font-bold'
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium px-4 mt-4 leading-relaxed">
        {t('learningCenter.favorites.folderHint')}
      </p>
    </aside>
  );
}

