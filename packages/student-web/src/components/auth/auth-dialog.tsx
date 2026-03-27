/**
 * 认证对话框联调壳层。
 * 当前只验证 RuoYi 认证契约、状态流转与交互边界，后续会被正式视觉稿替换。
 */
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'

import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

export type AuthDialogMode = 'login' | 'register'

interface AuthDialogProps {
  mode: AuthDialogMode
  onModeChange: (mode: AuthDialogMode) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function AuthDialog({ mode, onModeChange, onOpenChange, open }: AuthDialogProps) {
  const { busy, login, register } = useAuth()

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden p-0 md:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden bg-[#192435] px-6 py-7 text-white md:px-8 md:py-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(223,140,40,0.32),transparent_34%)]" />
          <div className="relative grid h-full gap-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="grid gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/70">
                Unified Auth Entry
              </p>
              <div className="grid gap-3">
                <h2 className="max-w-sm text-3xl font-semibold leading-tight md:text-4xl">
                  当前仅验证认证链路，不代表最终登录页视觉稿。
                </h2>
                <p className="max-w-sm text-sm leading-7 text-white/70 md:text-base">
                  这版对话框只负责注册、登录和认证态回流的逻辑联调；最终登录注册页面会在线框图完成后另行承接。
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-white/75">
              <Feature>默认租户与多租户下拉兼容</Feature>
              <Feature>验证码开关与刷新行为对齐 RuoYi</Feature>
              <Feature>Token 持久化后立即初始化用户上下文</Feature>
            </div>
          </div>
        </section>

        <section className="grid gap-6 px-6 py-7 md:px-8 md:py-9">
          <div className="grid gap-3">
            <div className="inline-flex rounded-full bg-[#ebe1d2] p-1">
              <ModeButton active={mode === 'login'} onClick={() => onModeChange('login')}>
                登录
              </ModeButton>
              <ModeButton active={mode === 'register'} onClick={() => onModeChange('register')}>
                注册
              </ModeButton>
            </div>
            <div className="grid gap-2">
              <h3 className="text-2xl font-semibold text-foreground">
                {mode === 'login' ? '回到小麦首页' : '创建一个新账号'}
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                {mode === 'login'
                  ? '当前只验证登录成功后关闭对话框并回到首页已认证上下文，不在这里定义最终视觉稿。'
                  : '当前只验证注册成功反馈与切回登录态的逻辑，不默认自动登录。'}
              </p>
            </div>
          </div>

          {mode === 'login' ? (
            <LoginForm
              busy={busy}
              onLogin={login}
              onSuccess={() => onOpenChange(false)}
              onSwitchMode={() => onModeChange('register')}
            />
          ) : (
            <RegisterForm
              busy={busy}
              onRegister={register}
              onRegistered={() => onModeChange('login')}
              onSwitchMode={() => onModeChange('login')}
            />
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <ArrowRight className="h-4 w-4 text-[#df8c28]" />
      <span>{children}</span>
    </div>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={
        active
          ? 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm'
          : 'rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground'
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
