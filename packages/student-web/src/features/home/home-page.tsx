/**
 * 文件说明：首页占位壳层。
 * 在正式业务首页落地前，先承接 student-web 的模板入口展示。
 */
import { useAppTranslation } from '@/app/i18n/use-app-translation';

/**
 * 渲染当前学生端首页占位内容，作为后续业务首页的承接入口。
 *
 * @returns 首页占位页面节点。
 */
export function HomePage() {
  const { t } = useAppTranslation();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-16">
      <section className="xm-surface-card w-full rounded-[var(--xm-radius-xl)] p-10">
        <div className="space-y-4">
          <span className="xm-floating-pill inline-flex px-3 py-1 text-sm font-medium">
            {t('home.scaffoldLabel')}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {t('home.title')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {t('home.description')}
          </p>
        </div>
      </section>
    </main>
  );
}
