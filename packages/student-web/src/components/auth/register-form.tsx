/**
 * 注册表单。
 * 负责当前 Story 1.1 所需的注册参数收集、校验与成功回流，不承载最终视觉设计。
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RegisterPayload } from '@/lib/api/auth'

import { useAuthFormFeatures } from './use-auth-form-features'

const registerSchema = z
  .object({
    code: z.string().optional(),
    confirmPassword: z.string().min(6, '请再次输入确认密码。'),
    password: z.string().min(6, '密码至少 6 位。'),
    tenantId: z.string().min(1, '请选择租户。'),
    username: z.string().trim().min(1, '请输入用户名。'),
    uuid: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '两次输入的密码不一致。',
        path: ['confirmPassword'],
      })
    }
  })

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterFormProps {
  busy: boolean
  onRegister: (payload: Omit<RegisterPayload, 'clientId' | 'grantType'>) => Promise<void>
  onRegistered: () => void
  onSwitchMode: () => void
}

export function RegisterForm({
  busy,
  onRegister,
  onRegistered,
  onSwitchMode,
}: RegisterFormProps) {
  const { captcha, captchaLoading, refreshCaptcha, tenantEnabled, tenantLoading, tenants } =
    useAuthFormFeatures()
  const form = useForm<RegisterFormValues>({
    defaultValues: {
      code: '',
      confirmPassword: '',
      password: '',
      tenantId: '000000',
      username: '',
      uuid: '',
    },
    resolver: zodResolver(registerSchema),
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

  async function handleSubmit(values: RegisterFormValues) {
    if (captcha?.captchaEnabled && !values.code?.trim()) {
      form.setError('code', { message: '请输入验证码。' })
      return
    }

    try {
      await onRegister({
        code: values.code?.trim() || undefined,
        confirmPassword: values.confirmPassword,
        password: values.password,
        tenantId: values.tenantId,
        userType: 'sys_user',
        username: values.username.trim(),
        uuid: values.uuid,
      })
      onRegistered()
    } catch (error) {
      toast.error(resolveErrorMessage(error))
      await handleRefreshCaptcha()
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
        <Label htmlFor="register-tenant">租户</Label>
        <select
          className="h-12 rounded-2xl border border-border bg-input px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!tenantEnabled || tenantLoading}
          id="register-tenant"
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
        id="register-username"
        label="用户名"
      >
        <Input
          autoComplete="username"
          id="register-username"
          placeholder="请输入新的用户名"
          {...form.register('username')}
        />
      </Field>

      <Field
        error={form.formState.errors.password?.message}
        id="register-password"
        label="密码"
      >
        <Input
          autoComplete="new-password"
          id="register-password"
          placeholder="至少 6 位"
          type="password"
          {...form.register('password')}
        />
      </Field>

      <Field
        error={form.formState.errors.confirmPassword?.message}
        id="register-confirm-password"
        label="确认密码"
      >
        <Input
          autoComplete="new-password"
          id="register-confirm-password"
          placeholder="再次输入密码"
          type="password"
          {...form.register('confirmPassword')}
        />
      </Field>

      {captcha?.captchaEnabled ? (
        <Field error={form.formState.errors.code?.message} id="register-code" label="验证码">
          <div className="grid gap-3 md:grid-cols-[1fr_164px]">
            <Input
              autoComplete="off"
              id="register-code"
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
                  alt="注册验证码"
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
          注册并返回登录
        </Button>
        <Button onClick={onSwitchMode} type="button" variant="secondary">
          已有账号？去登录
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

  return '注册失败，请稍后重试。'
}
