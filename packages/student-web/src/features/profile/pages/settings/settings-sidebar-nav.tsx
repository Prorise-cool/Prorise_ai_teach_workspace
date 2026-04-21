import { Link } from 'react-router-dom';
import { ShieldCheck, User } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export function SettingsSidebarNav() {
  const { t } = useAppTranslation();

  return (
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
  );
}

