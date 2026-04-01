/**
 * 文件说明：小麦独立认证页，统一承载登录、注册与回跳恢复。
 */
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { LoginForm } from '@/features/auth/login-form';
import { RegisterForm } from '@/features/auth/register-form';
import { useAuthRedirect } from '@/features/auth/use-auth-redirect';
import { HOME_ROUTE } from '@/features/navigation/route-paths';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

function resolveReturnLabel(returnTo: string) {
  if (returnTo.startsWith('/video')) {
    return '单题视频输入页';
  }

  if (returnTo.startsWith('/classroom')) {
    return '主题课堂输入页';
  }

  return '首页';
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const session = useAuthStore(state => state.session);
  const { returnTo, redirectAfterAuth } = useAuthRedirect();

  if (session) {
    return <Navigate replace to={returnTo} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 md:px-6">
      <section className="grid w-full overflow-hidden rounded-[28px] border border-border bg-card/90 shadow-[0_28px_72px_rgba(59,23,1,0.12)] md:grid-cols-[1.02fr_0.98fr]">
        <div className="relative hidden min-h-[680px] overflow-hidden border-r border-border bg-[radial-gradient(circle_at_top,_rgba(245,197,71,0.16),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.84),_rgba(245,237,225,0.92))] p-10 md:flex md:flex-col md:justify-between dark:bg-[radial-gradient(circle_at_top,_rgba(230,184,65,0.12),_transparent_42%),linear-gradient(180deg,_rgba(31,26,24,0.96),_rgba(17,14,13,0.98))]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
                XM
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  XiaoMai
                </div>
                <div className="text-lg font-semibold text-foreground">
                  独立认证入口
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-foreground">
                登录后，继续回到你原本想进入的学习上下文
              </h1>
              <p className="max-w-md text-base leading-7 text-muted-foreground">
                这里不承担营销分流，也不会弹窗打断首页。你只需要完成登录或注册，然后回到原始目标页继续操作。
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="relative flex h-[290px] w-[340px] items-end justify-center gap-3">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(245,197,71,0.16),_transparent_68%)] blur-3xl" />
              <div className="h-44 w-20 rounded-t-[48px] bg-[#d97736]" />
              <div className="h-32 w-24 rounded-t-[56px] bg-[#e3d5c8]" />
              <div className="h-56 w-20 rounded-t-[44px] bg-primary" />
              <div className="h-40 w-20 rounded-t-[48px] bg-[#5c534a]" />
            </div>
          </div>

          <div className="space-y-3 text-center">
            <p className="text-xl font-semibold text-foreground">
              Make your learning easier and immersive with XiaoMai
            </p>
            <p className="text-sm text-muted-foreground">
              认证成功后会自动恢复到 {resolveReturnLabel(returnTo)}。
            </p>
          </div>
        </div>

        <div className="flex min-h-[680px] flex-col bg-card/95 px-6 py-8 md:px-10">
          <div className="flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
              to={HOME_ROUTE}
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              {mode === 'login' ? 'Login' : 'Register'}
            </span>
          </div>

          <div className="mt-8 flex flex-1 flex-col">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-3xl font-semibold tracking-tight text-foreground">
                  {mode === 'login' ? 'Welcome back!' : 'Create account'}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {mode === 'login'
                    ? '继续使用统一认证链路进入小麦。错误信息会停留在当前页，便于你直接修正。'
                    : '注册成功后会直接建立会话，并恢复到最初的目标入口。'}
                </p>
              </div>

              <div className="rounded-[var(--xm-radius-lg)] border border-border bg-background/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      登录后将继续进入
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {resolveReturnLabel(returnTo)} · {returnTo}
                    </div>
                  </div>
                </div>
              </div>

              <div className="inline-flex rounded-full border border-border bg-background/80 p-1">
                {(['login', 'register'] as const).map(tab => (
                  <button
                    aria-pressed={mode === tab}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold transition',
                      mode === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    key={tab}
                    onClick={() => setMode(tab)}
                    type="button"
                  >
                    {tab === 'login' ? '登录' : '注册'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex-1">
              {mode === 'login' ? (
                <LoginForm onSuccess={redirectAfterAuth} returnTo={returnTo} />
              ) : (
                <RegisterForm onSuccess={redirectAfterAuth} returnTo={returnTo} />
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
              <span>
                {mode === 'login' ? '还没有账号？' : '已有账号？'}
              </span>
              <button
                className="inline-flex items-center gap-2 font-semibold text-primary transition hover:brightness-110"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                type="button"
              >
                {mode === 'login' ? '立即注册' : '返回登录'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
