/**
 * 文件说明：macOS 风格 Dock（从 Ux 成品页抽取，Epic 8/9 共用）。
 */
import type { ElementType, ReactNode } from 'react';
import { BookOpen, Globe, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

export type SurfaceDockProps = {
  activeTooltip: string;
  activeIcon: ElementType;
  learningCenterTo?: string | null;
  settingsTo?: string | null;
  avatarUrl?: string | null;
  children?: ReactNode;
};

export function SurfaceDock({
  activeTooltip,
  activeIcon: ActiveIcon,
  learningCenterTo = '/learning',
  settingsTo = '/settings',
  avatarUrl = 'https://i.pravatar.cc/150?img=68',
}: SurfaceDockProps) {
  const { t } = useAppTranslation();
  const { toggleThemeMode } = useThemeMode();
  const localeLabel = appI18n.resolvedLanguage === 'en-US' ? 'EN / 中' : '中 / EN';

  const toggleLocale = () => {
    const nextLocale = appI18n.resolvedLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
    void appI18n.changeLanguage(nextLocale);
  };

  return (
    <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl border border-bordercolor-light dark:border-bordercolor-dark px-3 py-2 rounded-[24px] shadow-dock flex items-end gap-1 dock-container">
        <div className="dock-icon-wrapper w-10 relative">
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-text-primary dark:bg-text-primary-dark" />
          <div className="dock-tooltip bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark px-2.5 py-1 rounded shadow-md border border-transparent dark:border-bordercolor-dark text-[11px] font-bold">
            {activeTooltip}
          </div>
          <div className="dock-icon w-10 h-10 rounded-[12px] bg-text-primary dark:bg-text-primary-dark flex items-center justify-center text-surface-light dark:text-surface-dark shadow-sm">
            <ActiveIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="dock-icon-wrapper w-10">
          <div className="dock-tooltip bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark px-2.5 py-1 rounded shadow-md border border-transparent dark:border-bordercolor-dark text-[11px] font-bold">
            {t('learningCenter.dock.learning')}
          </div>
          {learningCenterTo ? (
            <Link
              to={learningCenterTo}
              className="dock-icon w-10 h-10 rounded-[12px] bg-transparent flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary hover:text-text-primary dark:hover:bg-[#1a1614] dark:hover:text-text-primary-dark btn-transition"
            >
              <BookOpen className="w-5 h-5" />
            </Link>
          ) : (
            <button
              type="button"
              className="dock-icon w-10 h-10 rounded-[12px] bg-transparent flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary hover:text-text-primary dark:hover:bg-[#1a1614] dark:hover:text-text-primary-dark btn-transition"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="w-px h-8 bg-bordercolor-light dark:bg-bordercolor-dark mx-1 self-center mb-1" />

        <div className="dock-icon-wrapper w-10">
          <div className="dock-tooltip bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark px-2.5 py-1 rounded shadow-md border border-transparent dark:border-bordercolor-dark text-[11px] font-bold">
            {localeLabel}
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="dock-icon w-10 h-10 rounded-[12px] bg-transparent flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary hover:text-text-primary dark:hover:bg-[#1a1614] dark:hover:text-text-primary-dark btn-transition"
          >
            <Globe className="w-5 h-5" />
          </button>
        </div>

        <div className="dock-icon-wrapper w-10">
          <div className="dock-tooltip bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark px-2.5 py-1 rounded shadow-md border border-transparent dark:border-bordercolor-dark text-[11px] font-bold">
            {t('learningCenter.dock.theme')}
          </div>
          <button
            type="button"
            onClick={toggleThemeMode}
            className="dock-icon w-10 h-10 rounded-[12px] bg-transparent flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary hover:text-text-primary dark:hover:bg-[#1a1614] dark:hover:text-text-primary-dark btn-transition"
          >
            <Sun className="w-5 h-5 hidden dark:block" />
            <Moon className="w-5 h-5 block dark:hidden" />
          </button>
        </div>

        <div className="dock-icon-wrapper w-10 relative">
          <div className="dock-tooltip bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark px-2.5 py-1 rounded shadow-md border border-transparent dark:border-bordercolor-dark text-[11px] font-bold">
            {t('learningCenter.dock.settings')}
          </div>
          {settingsTo ? (
            <Link
              to={settingsTo}
              className="dock-icon w-10 h-10 rounded-[12px] overflow-hidden border border-transparent hover:border-bordercolor-light dark:hover:border-bordercolor-dark shadow-sm btn-transition"
            >
              <img src={avatarUrl ?? ''} alt="User" className="w-full h-full object-cover" />
            </Link>
          ) : (
            <button
              type="button"
              className="dock-icon w-10 h-10 rounded-[12px] overflow-hidden border border-transparent hover:border-bordercolor-light dark:hover:border-bordercolor-dark shadow-sm btn-transition"
            >
              <img src={avatarUrl ?? ''} alt="User" className="w-full h-full object-cover" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
