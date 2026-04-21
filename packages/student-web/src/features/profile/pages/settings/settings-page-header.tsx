import { Link } from 'react-router-dom';
import { ArrowLeft, Leaf } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export function SettingsPageHeader() {
  const { t } = useAppTranslation();

  return (
    <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
      <Link
        to="/"
        className="font-bold text-lg flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
          <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
        </div>
        <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block text-xl">
          XiaoMai
        </span>
      </Link>

      <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
        <Link
          to="/learning"
          className="bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm border border-bordercolor-light dark:border-bordercolor-dark btn-transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold">{t('learningCenter.page.backToLearning')}</span>
        </Link>
      </div>
    </header>
  );
}

