/**
 * 首页联调验证壳层。
 * 当前页面只用于验证 Story 1.1 的认证闭环，不代表最终登录/注册视觉页面。
 */
import { ArrowRight, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { AuthDialog, type AuthDialogMode } from '@/components/auth/auth-dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { env } from '@/lib/env'

export function HomePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<AuthDialogMode>('login')
  const { busy, initialized, isAuthenticated, logout, session, status, userInfo } = useAuth()

  const userLabel = userInfo?.user?.nickName || userInfo?.user?.userName || '已登录用户'

  function openDialog(nextMode: AuthDialogMode) {
    setMode(nextMode)
    setDialogOpen(true)
  }

  return (
    <>
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(29,78,216,0.16),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(223,140,40,0.2),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(25,36,53,0.07),transparent_34%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-muted-foreground">
                Prorise Learning Platform
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {env.VITE_APP_TITLE}
              </h1>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              RuoYi 统一认证主机：{env.VITE_RUOYI_BASE_URL}
            </div>
          </header>

          <section className="grid gap-5 rounded-[32px] border border-border bg-card/90 p-6 shadow-[0_24px_90px_-48px_rgba(25,36,53,0.45)] md:grid-cols-[1.08fr_0.92fr] md:p-8">
            <div className="grid content-start gap-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ebe1d2] px-3 py-2 text-sm font-medium text-[#6d5b43]">
                <Sparkles className="h-4 w-4 text-accent" />
                认证联调验证壳层，非最终视觉页面
              </div>
              <div className="grid gap-4">
                <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
                  在首页验证注册和登录链路，然后继续检查认证上下文。
                </h2>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                  当前实现只承担 Story 1.1 的逻辑联调与契约验证，不承担最终登录注册页的视觉交付。
                  这一版重点是打通 RuoYi 登录注册闭环、Token 持久化与用户上下文初始化，为后续正式页面和受保护路由建立基线。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {!isAuthenticated ? (
                  <>
                    <Button onClick={() => openDialog('login')} size="lg">
                      登录
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => openDialog('register')} size="lg" variant="secondary">
                      注册
                    </Button>
                  </>
                ) : (
                  <Button disabled={busy} onClick={() => void logout()} size="lg" variant="secondary">
                    <LogOut className="h-4 w-4" />
                    登出并清理认证态
                  </Button>
                )}
              </div>
            </div>

            <section className="grid gap-4 rounded-[28px] border border-black/5 bg-white/80 p-5 shadow-[0_14px_40px_-28px_rgba(25,36,53,0.4)]">
              <div className="grid gap-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  当前首页上下文
                </p>
                {!initialized || status === 'loading' ? (
                  <div className="rounded-3xl bg-[#f5efe6] px-4 py-5 text-sm text-muted-foreground">
                    正在恢复本地认证态并验证 `getInfo` …
                  </div>
                ) : isAuthenticated ? (
                  <div className="grid gap-4 rounded-3xl bg-[#f7fbff] px-4 py-5">
                    <div className="grid gap-1">
                      <p className="text-sm text-muted-foreground">已认证用户</p>
                      <p className="text-2xl font-semibold text-foreground">{userLabel}</p>
                    </div>
                    <dl className="grid gap-3 text-sm text-muted-foreground">
                      <MetaRow label="角色">{userInfo?.roles.join('，') || '未返回角色'}</MetaRow>
                      <MetaRow label="权限数量">{String(userInfo?.permissions.length ?? 0)}</MetaRow>
                      <MetaRow label="Access Token">
                        {session?.accessToken ? `${session.accessToken.slice(0, 18)}…` : '无'}
                      </MetaRow>
                    </dl>
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-3xl bg-[#f7fbff] px-4 py-5">
                    <p className="rounded-2xl border border-dashed border-[#df8c28]/40 bg-[#fff7eb] px-3 py-2 text-sm text-[#8a5720]">
                      当前首页仅用于认证联调验证，不是最终线框图对应的正式页面。
                    </p>
                    <p className="text-sm leading-7 text-muted-foreground">
                      当前处于未认证首页态，登录或注册均通过对话框完成，不跳转到独立认证页。
                    </p>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <StatusItem>未授权时统一回到首页并清理本地 Token</StatusItem>
                      <StatusItem>后续受保护页面守卫可直接读取 auth store</StatusItem>
                      <StatusItem>`Authorization: Bearer &lt;token&gt;` 已预留</StatusItem>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>

      <AuthDialog mode={mode} onModeChange={setMode} onOpenChange={setDialogOpen} open={dialogOpen} />
    </>
  )
}

function MetaRow({ children, label }: { children: string; label: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-black/5 bg-white px-3 py-2">
      <dt>{label}</dt>
      <dd className="max-w-[14rem] text-right text-foreground">{children}</dd>
    </div>
  )
}

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-3 py-2 text-foreground">{children}</div>
  )
}
