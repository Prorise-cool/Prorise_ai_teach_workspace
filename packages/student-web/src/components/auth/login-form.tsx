/**
 * 登录表单。
 * 负责当前 Story 1.1 所需的登录参数收集、校验与错误回流，不承载最终视觉设计。
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LoginPayload } from '@/lib/api/auth'

import { useAuthFormFeatures } from './use-auth-form-features'

const loginSchema = z.object({
  code: z.string().optional(),
  password: z.string().min(1, '请输入密码。'),
  tenantId: z.string().min(1, '请选择租户。'),
  username: z.string().trim().min(1, '请输入用户名。'),
  uuid: z.string().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  busy: boolean
  onLogin: (payload: Omit<LoginPayload, 'clientId' | 'grantType'>) => Promise<void>
  onSuccess: () => void
  onSwitchMode: () => void
}

/**
 * 登录表单组件。
 * 对齐 Story 1.1 的登录参数、验证码与失败回流规则。
 */
export function LoginForm({ busy, onLogin, onSuccess, onSwitchMode }: LoginFormProps) {
  const { captcha, captchaLoading, refreshCaptcha, tenantEnabled, tenantLoading, tenants } =
    useAuthFormFeatures()
  const form = useForm<LoginFormValues>({
    defaultValues: {
      code: '',
      password: '',
      tenantId: '000000',
      username: '',
      uuid: '',
    },
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (tenantEnabled && tenants[0]?.tenantId) {
      form.setValue('tenantId', tenants[0].tenantId, { shouldDirty: false })
    }
  }, [form, tenantEnabled, tenants])

  useEffect(() => {
    if (captcha?.uuid) {
      form.setValue('uuid', captcha.uuid, { shouldDirty: false })
    }
  }, [captcha?.uuid, form])

  async function handleRefreshCaptcha() {
    const nextCaptcha = await refreshCaptcha()
    form.setValue('code', '')
    form.setValue('uuid', nextCaptcha.uuid ?? '')
  }

  async function handleSubmit(values: LoginFormValues) {
    if (captcha?.captchaEnabled && !values.code?.trim()) {
      form.setError('code', { message: '请输入验证码。' })
      return
    }

    try {
      await onLogin({
        code: values.code?.trim() || undefined,
        password: values.password,
        tenantId: values.tenantId,
        username: values.username.trim(),
        uuid: values.uuid,
      })
      onSuccess()
    } catch (error) {
      toast.error(resolveErrorMessage(error))
      // 仅在验证码开关开启时刷新，避免无验证码环境下多打一跳无意义请求。
      if (captcha?.captchaEnabled) {
        await handleRefreshCaptcha()
      }
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        void form.handleSubmit(handleSubmit)(event)
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="login-tenant">租户</Label>
        <select
          className="h-12 rounded-2xl border border-border bg-input px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!tenantEnabled || tenantLoading}
          id="login-tenant"
          {...form.register('tenantId')}
        >
          {!tenantEnabled ? <option value="000000">默认租户 000000</option> : null}
          {tenants.map(tenant => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.companyName}（{tenant.tenantId}）
            </option>
          ))}
        </select>
      </div>

      <Field
        error={form.formState.errors.username?.message}
        id="login-username"
        label="用户名"
      >
        <Input
          autoComplete="username"
          id="login-username"
          placeholder="请输入用户名"
          {...form.register('username')}
        />
      </Field>

      <Field
        error={form.formState.errors.password?.message}
        id="login-password"
        label="密码"
      >
        <Input
          autoComplete="current-password"
          id="login-password"
          placeholder="请输入密码"
          type="password"
          {...form.register('password')}
        />
      </Field>

      {captcha?.captchaEnabled ? (
        <Field error={form.formState.errors.code?.message} id="login-code" label="验证码">
          <div className="grid gap-3 md:grid-cols-[1fr_164px]">
            <Input
              autoComplete="off"
              id="login-code"
              placeholder="请输入验证码结果"
              {...form.register('code')}
            />
            <button
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white/80 px-3 text-sm font-medium text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={captchaLoading}
              onClick={() => {
                void handleRefreshCaptcha()
              }}
              type="button"
            >
              {captchaLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {captcha?.img ? (
                <img
                  alt="登录验证码"
                  className="max-h-8 rounded-lg object-contain"
                  src={`data:image/gif;base64,${captcha.img}`}
                />
              ) : (
                <span>刷新验证码</span>
              )}
            </button>
          </div>
        </Field>
      ) : null}

      <div className="grid gap-3 pt-2">
        <Button disabled={busy} size="lg" type="submit">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          登录并返回首页
        </Button>
        <Button onClick={onSwitchMode} type="button" variant="secondary">
          没有账号？去注册
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

function Field({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode
  error?: string
  id: string
  label: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-[#b64826]">{error}</p> : null}
    </div>
  )
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return '登录失败，请稍后重试。'
}
