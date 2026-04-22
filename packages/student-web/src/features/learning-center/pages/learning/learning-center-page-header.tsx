import { ChevronRight, Flame } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { AppBrand } from '@/components/brand/app-brand';

export function LearningCenterPageHeader() {
  const { t } = useAppTranslation();

  return (
    <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
      <div className="pointer-events-auto">
        <AppBrand to="/" size="md" hideTextOnMobile />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto cursor-pointer group">
        <div className="bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-3 shadow-island border border-transparent dark:border-bordercolor-dark transition-transform duration-200 hover:scale-[1.02]">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/20 dark:bg-brand/10">
            <Flame className="w-3.5 h-3.5 text-brand fill-brand" />
          </div>
          <span className="text-sm font-bold tracking-wide">{t('learningCenter.page.streakLabel')}</span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </div>
      </div>
    </header>
  );
}

