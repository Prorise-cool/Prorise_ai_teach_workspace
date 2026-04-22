import type { ReactNode } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';

type FavoritesLayoutProps = {
  sidebar: ReactNode;
  content: ReactNode;
  dialogs?: ReactNode;
};

export function FavoritesLayout({ sidebar, content, dialogs }: FavoritesLayoutProps) {
  const { t } = useAppTranslation();
  const workspaceRoutes = t('entryNav.workspaceRoutes', { returnObjects: true }) as WorkspaceRoute[];

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <GlobalTopNav
        links={[]}
        variant="workspace"
        workspaceRoutes={workspaceRoutes}
        showBrandIcon
        showAuthAction
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-16 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 relative z-10">
        {sidebar}
        {content}
      </main>

      {dialogs}
    </div>
  );
}
