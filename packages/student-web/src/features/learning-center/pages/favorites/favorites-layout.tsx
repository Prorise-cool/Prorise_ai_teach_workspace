import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { AppBrand } from '@/components/brand/app-brand';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';

type FavoritesLayoutProps = {
  sidebar: ReactNode;
  content: ReactNode;
  dialogs?: ReactNode;
};

export function FavoritesLayout({ sidebar, content, dialogs }: FavoritesLayoutProps) {
  const { t } = useAppTranslation();

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <AppBrand to="/" size="md" hideTextOnMobile />
        </div>

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

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-40 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 relative z-10">
        {sidebar}
        {content}
      </main>

      <SurfaceDashboardDock active="learning" />

      {dialogs}
    </div>
  );
}

