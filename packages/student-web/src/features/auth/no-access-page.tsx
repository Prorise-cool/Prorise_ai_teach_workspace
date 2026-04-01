/**
 * 文件说明：提供 Story 1.3 / 1.6 统一复用的 403 权限不足态页面。
 */
import { AlertTriangle, ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  HOME_ROUTE,
  LOGIN_ROUTE
} from '@/features/navigation/route-paths';

type NoAccessState = {
  from?: string;
  message?: string;
};

export function NoAccessPage() {
  const location = useLocation();
  const state = (location.state as NoAccessState | null) ?? null;
  const fallbackMessage =
    state?.message ?? '当前账号已登录，但暂无小麦学生端访问权限。';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <section className="xm-surface-card grid w-full gap-10 overflow-hidden rounded-[var(--xm-radius-xl)] border border-border bg-card/90 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div className="space-y-6">
          <span className="xm-floating-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            权限边界
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              当前账号暂时不能进入这个入口
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {fallbackMessage}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
              to={HOME_ROUTE}
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/60 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
              to={LOGIN_ROUTE}
            >
              <LogOut className="h-4 w-4" />
              使用其他账号登录
            </Link>
          </div>
          <div className="rounded-[var(--xm-radius-lg)] border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">安全回退说明</div>
            <p className="mt-2 leading-6">
              403 表示“你已登录，但当前角色或权限不足”，不会清理仍然有效的会话，也不会伪装成 401。
              {state?.from ? ` 原始目标：${state.from}` : ''}
            </p>
          </div>
        </div>

        <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[var(--xm-radius-xl)] border border-border bg-[radial-gradient(circle_at_top,_rgba(245,197,71,0.22),_transparent_56%),linear-gradient(180deg,_rgba(255,255,255,0.72),_rgba(245,237,225,0.84))] p-8 dark:bg-[radial-gradient(circle_at_top,_rgba(230,184,65,0.18),_transparent_56%),linear-gradient(180deg,_rgba(31,26,24,0.92),_rgba(17,14,13,0.98))]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,23,1,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,23,1,0.04)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(245,237,225,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,237,225,0.03)_1px,transparent_1px)]" />
          <div className="relative flex flex-col items-center gap-5 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-amber-200 bg-white/90 shadow-lg dark:border-amber-900/50 dark:bg-neutral-900/80">
              <AlertTriangle className="h-11 w-11 text-amber-500" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                403
              </div>
              <div className="text-2xl font-semibold text-foreground">
                Access Boundary
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
