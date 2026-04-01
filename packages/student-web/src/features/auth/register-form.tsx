/**
 * 文件说明：承载注册表单与字段校验。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuthStore } from '@/stores/auth-store';

const registerSchema = z
  .object({
    username: z.string().min(1, '请输入注册账号'),
    code: z.string().min(1, '请输入验证码'),
    password: z.string().min(6, '请输入至少 6 位密码'),
    confirmPassword: z.string().min(6, '请再次确认密码'),
    agreed: z.boolean().refine(value => value, {
      message: '请先阅读并同意协议'
    })
  })
  .refine(values => values.password === values.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword']
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type RegisterFormProps = {
  returnTo: string;
  onSuccess: () => void;
};

export function RegisterForm({
  returnTo,
  onSuccess
}: RegisterFormProps) {
  const registerAccount = useAuthStore(state => state.register);
  const isSubmitting = useAuthStore(state => state.isSubmitting);
  const errorMessage = useAuthStore(state => state.errorMessage);
  const setErrorMessage = useAuthStore(state => state.setErrorMessage);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      code: '',
      password: '',
      confirmPassword: '',
      agreed: true
    }
  });

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    setError('root', {
      message: errorMessage
    });
  }, [errorMessage, setError]);

  async function submitRegister(values: RegisterFormValues) {
    setErrorMessage(null);

    try {
      await registerAccount({
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        code: values.code,
        returnTo
      });
      toast.success('注册成功，正在进入小麦');
      onSuccess();
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : '注册失败，请稍后重试'
      });
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={event => {
        void handleSubmit(submitRegister)(event);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="register-username">
            账号
          </label>
          <input
            {...register('username')}
            aria-describedby={errors.username ? 'register-username-error' : undefined}
            aria-invalid={Boolean(errors.username)}
            className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
            id="register-username"
            placeholder="例如：new_student"
            type="text"
          />
          {errors.username ? (
            <p className="text-sm text-destructive" id="register-username-error" role="alert">
              {errors.username.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="register-code">
            验证码
          </label>
          <input
            {...register('code')}
            aria-describedby={errors.code ? 'register-code-error' : undefined}
            aria-invalid={Boolean(errors.code)}
            className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
            id="register-code"
            placeholder="输入邮箱或短信验证码"
            type="text"
          />
          {errors.code ? (
            <p className="text-sm text-destructive" id="register-code-error" role="alert">
              {errors.code.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="register-password">
            设置密码
          </label>
          <input
            {...register('password')}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            aria-invalid={Boolean(errors.password)}
            className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
            id="register-password"
            placeholder="至少 6 位"
            type="password"
          />
          {errors.password ? (
            <p className="text-sm text-destructive" id="register-password-error" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-foreground"
            htmlFor="register-confirm-password"
          >
            确认密码
          </label>
          <input
            {...register('confirmPassword')}
            aria-describedby={
              errors.confirmPassword ? 'register-confirm-password-error' : undefined
            }
            aria-invalid={Boolean(errors.confirmPassword)}
            className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
            id="register-confirm-password"
            placeholder="再次输入密码"
            type="password"
          />
          {errors.confirmPassword ? (
            <p
              className="text-sm text-destructive"
              id="register-confirm-password-error"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          {...register('agreed')}
          className="mt-1 h-4 w-4 rounded border-border"
          type="checkbox"
        />
        <span>我已阅读并同意《用户协议》和《隐私政策》</span>
      </label>
      {errors.agreed ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.agreed.message}
        </p>
      ) : null}

      {errors.root?.message ? (
        <div
          className="rounded-[var(--xm-radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {errors.root.message}
        </div>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        <UserPlus className="h-4 w-4" />
        {isSubmitting ? '注册中...' : '注册并登录'}
      </button>
    </form>
  );
}
