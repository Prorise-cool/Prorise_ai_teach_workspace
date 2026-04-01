/**
 * 文件说明：正式首页，承载双入口理解、推荐提示、登录态恢复与主动登出。
 */
import { ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EntryCard } from '@/features/home/entry-card';
import { RecommendationHint } from '@/features/home/recommendation-hint';
import { resolveRoleCapabilities } from '@/features/auth/role-capabilities';
import { getHomeEntryDescriptors } from '@/features/navigation/entry-visibility';
import {
  LANDING_ROUTE,
  LOGIN_ROUTE
} from '@/features/navigation/route-paths';
import { useAuthStore } from '@/stores/auth-store';

function resolveRecommendationVariant(recommendationValue: string | null) {
  if (recommendationValue === 'video') {
    return 'video' as const;
  }

  if (recommendationValue === 'none') {
    return 'fallback' as const;
  }

  return 'classroom' as const;
}

export function HomePage() {
  const [searchParams] = useSearchParams();
  const session = useAuthStore(state => state.session);
  const logout = useAuthStore(state => state.logout);
  const recommendationVariant = resolveRecommendationVariant(
    searchParams.get('recommend')
  );
  const capabilityMatrix = resolveRoleCapabilities(session?.user ?? null);
  const entryDescriptors = getHomeEntryDescriptors(session?.user ?? null);

  const headerCopy = useMemo(() => {
    if (!session) {
      return '先看清入口差异，再决定从哪一条主线开始。';
    }

    return `当前以 ${capabilityMatrix.roleLabel} 身份进入，入口与权限提示会自动对齐。`;
  }, [capabilityMatrix.roleLabel, session]);

  async function handleLogout() {
    await logout();
    toast.success('已安全退出登录');
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(245,197,71,0.22),_transparent_58%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,23,1,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,23,1,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50 dark:bg-[linear-gradient(rgba(245,237,225,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,237,225,0.03)_1px,transparent_1px)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="mx-auto flex w-full items-center justify-between rounded-full border border-border bg-white/72 px-5 py-3 shadow-sm backdrop-blur dark:bg-[rgba(31,26,24,0.72)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              XM
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                XiaoMai
              </div>
              <div className="text-base font-semibold text-foreground">
                默认产品首页
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="hidden rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary md:inline-flex"
              to={LANDING_ROUTE}
            >
              查看营销页
            </Link>

            {session ? (
              <>
                <div className="hidden rounded-full border border-border bg-background/70 px-4 py-2 text-sm text-muted-foreground md:block">
                  {session.user.nickname} · {capabilityMatrix.roleLabel}
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                  onClick={() => {
                    void handleLogout();
                  }}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </>
            ) : (
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
                to={LOGIN_ROUTE}
              >
                登录 / 注册
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[minmax(0,1.1fr)_340px] lg:py-12">
          <div className="space-y-8">
            <div className="space-y-6">
              <span className="xm-floating-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                双入口理解
              </span>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
                  一眼分清“系统学一个主题”与“讲清一题”
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                  小麦的首页只负责三件事：解释两个入口的差异、在可用时给出推荐提示、并把你带到正确的输入壳层。
                </p>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {headerCopy}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {entryDescriptors.map(descriptor => (
                <EntryCard descriptor={descriptor} key={descriptor.key} />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <RecommendationHint variant={recommendationVariant} />

            <section className="rounded-[var(--xm-radius-xl)] border border-border bg-card/85 p-5 shadow-sm">
              <div className="text-sm font-semibold text-foreground">
                当前入口边界
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {capabilityMatrix.supportingHint}
              </p>

              <div className="mt-4 space-y-3 text-sm">
                {capabilityMatrix.showTeacherPilotNote ? (
                  <div className="rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-3 text-muted-foreground">
                    教师角色会保留学习入口，但不会在学生端直接暴露独立 ToB 工作台。
                  </div>
                ) : null}
                {capabilityMatrix.showAdminBoundaryNote ? (
                  <div className="rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-3 text-muted-foreground">
                    管理员账号仍以 RuoYi 权限为事实来源；学生端只展示学习相关提示，不注入管理后台导航。
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
