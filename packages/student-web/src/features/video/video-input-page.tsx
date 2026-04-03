/**
 * 文件说明：视频讲解入口占位页。
 * 当前先用于承接 Story 1.4 的全局导航分发与未登录回跳链路。
 */
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';

import '@/features/home/styles/entry-pages.css';

type EntryNavLink = {
  href: string;
  label: string;
};

/**
 * 渲染视频讲解入口占位页。
 *
 * @returns 视频入口页节点。
 */
export function VideoInputPage() {
  const { t } = useAppTranslation();
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as EntryNavLink[];

  return (
    <main className="min-h-screen px-5 pb-12 pt-5 md:px-8">
      <GlobalTopNav
        links={navLinks}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <section className="mx-auto mt-10 max-w-[980px]">
        <div className="xm-surface-card rounded-[var(--xm-radius-xl)] p-10 text-center">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-sm font-medium">
            {t('entryRoutes.video.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {t('entryRoutes.video.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t('entryRoutes.video.description')}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              {t('entryRoutes.video.primaryAction')}
            </Link>

            <Link
              to="/landing"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {t('entryRoutes.video.secondaryAction')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
