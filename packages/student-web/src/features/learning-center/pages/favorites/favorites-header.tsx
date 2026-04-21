import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type FavoritesHeaderProps = {
  title: string;
  activeType: string | null;
  sortOrder: 'recent' | 'asc';
  onSelectType: (value: string | null) => void;
  onSelectSortOrder: (value: 'recent' | 'asc') => void;
};

export function FavoritesHeader({
  title,
  activeType,
  sortOrder,
  onSelectType,
  onSelectSortOrder,
}: FavoritesHeaderProps) {
  const { t } = useAppTranslation();
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  useEffect(() => {
    if (!typeDropdownOpen) return;

    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!typeDropdownRef.current?.contains(target)) {
        setTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeDropdownOpen]);

  useEffect(() => {
    if (!sortDropdownOpen) return;

    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!sortDropdownRef.current?.contains(target)) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortDropdownOpen]);

  const typeLabel = useMemo(() => {
    if (!activeType) return t('learningCenter.favorites.filterAll');
    if (activeType === 'video') return t('learningCenter.favorites.filterVideo');
    if (activeType === 'classroom') return t('learningCenter.favorites.filterClassroom');
    if (activeType === 'companion') return t('learningCenter.favorites.filterCompanion');
    return activeType;
  }, [activeType, t]);

  const sortLabel =
    sortOrder === 'asc' ? t('learningCenter.favorites.sortAsc') : t('learningCenter.favorites.sortRecent');

  return (
    <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-20">
      <div>
        <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
          {title}
        </h1>
        <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
          {t('learningCenter.favorites.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div ref={typeDropdownRef} className="relative custom-dropdown-container">
          <button
            type="button"
            onClick={() => {
              setTypeDropdownOpen((current) => !current);
              setSortDropdownOpen(false);
            }}
            className="dropdown-trigger flex items-center justify-between gap-3 min-w-[140px] px-4 py-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl text-[13px] font-bold text-text-primary dark:text-text-primary-dark shadow-sm transition-all outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
          >
            <span className="dropdown-label">{typeLabel}</span>
            <ChevronDown
              className={
                typeDropdownOpen
                  ? 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200 rotate-180'
                  : 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200'
              }
            />
          </button>
          <div
            className={
              typeDropdownOpen
                ? 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-100 pointer-events-auto translate-y-0 transition-all duration-200 z-50'
                : 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-0 pointer-events-none -translate-y-2 transition-all duration-200 z-50'
            }
          >
            <div className="p-1.5 flex flex-col gap-0.5">
              {[
                { type: null, label: t('learningCenter.favorites.filterAll') },
                { type: 'video', label: t('learningCenter.favorites.filterVideo') },
                { type: 'classroom', label: t('learningCenter.favorites.filterClassroom') },
                { type: 'companion', label: t('learningCenter.favorites.filterCompanion') },
              ].map((item) => {
                const isActive = (item.type ?? null) === (activeType ?? null);
                return (
                  <button
                    key={item.type ?? 'all'}
                    type="button"
                    onClick={() => {
                      onSelectType(item.type);
                      setTypeDropdownOpen(false);
                    }}
                    className={
                      isActive
                        ? 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold bg-secondary dark:bg-bg-dark text-text-primary dark:text-text-primary-dark transition-colors'
                        : 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors'
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={sortDropdownRef} className="relative custom-dropdown-container">
          <button
            type="button"
            onClick={() => {
              setSortDropdownOpen((current) => !current);
              setTypeDropdownOpen(false);
            }}
            className="dropdown-trigger flex items-center justify-between gap-3 min-w-[140px] px-4 py-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl text-[13px] font-bold text-text-primary dark:text-text-primary-dark shadow-sm transition-all outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
          >
            <span className="dropdown-label">{sortLabel}</span>
            <ChevronDown
              className={
                sortDropdownOpen
                  ? 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200 rotate-180'
                  : 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200'
              }
            />
          </button>
          <div
            className={
              sortDropdownOpen
                ? 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-100 pointer-events-auto translate-y-0 transition-all duration-200 z-50'
                : 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-0 pointer-events-none -translate-y-2 transition-all duration-200 z-50'
            }
          >
            <div className="p-1.5 flex flex-col gap-0.5">
              {[
                { order: 'recent' as const, label: t('learningCenter.favorites.sortRecent') },
                { order: 'asc' as const, label: t('learningCenter.favorites.sortAsc') },
              ].map((item) => {
                const isActive = item.order === sortOrder;
                return (
                  <button
                    key={item.order}
                    type="button"
                    onClick={() => {
                      onSelectSortOrder(item.order);
                      setSortDropdownOpen(false);
                    }}
                    className={
                      isActive
                        ? 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold bg-secondary dark:bg-bg-dark text-text-primary dark:text-text-primary-dark transition-colors'
                        : 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors'
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

