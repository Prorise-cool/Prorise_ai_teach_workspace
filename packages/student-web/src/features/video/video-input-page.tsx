/**
 * 文件说明：视频讲解入口占位页。
 * 当前先用于承接 Story 1.4 的全局导航分发与未登录回跳链路。
 */
import { Link } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import '@/features/video/styles/video-input-page.scss';

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
    <main className="xm-video-input-page min-h-screen px-5 pb-12 pt-5 md:px-8">
      <GlobalTopNav
        links={navLinks}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <section className="xm-video-input-page__shell mx-auto mt-10 max-w-[980px]">
        <Card className="xm-video-input-page__card xm-surface-card text-center">
          <CardContent className="p-10">
            <Badge variant="floating">
              {t('entryRoutes.video.badge')}
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              {t('entryRoutes.video.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {t('entryRoutes.video.description')}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">{t('entryRoutes.video.primaryAction')}</Link>
              </Button>

              <Button asChild variant="outline">
                <Link to="/landing">{t('entryRoutes.video.secondaryAction')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
