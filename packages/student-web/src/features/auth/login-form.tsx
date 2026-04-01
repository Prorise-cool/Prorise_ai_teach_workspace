/**
 * 文件说明：承载登录表单、字段级校验与表单级错误提示。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuthStore } from '@/stores/auth-store';

const loginSchema = z.object({
  username: z.string().min(1, '请输入手机号、邮箱或用户名'),
  password: z.string().min(6, '请输入至少 6 位密码')
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  returnTo: string;
  onSuccess: () => void;
};

export function LoginForm({ returnTo, onSuccess }: LoginFormProps) {
  const login = useAuthStore(state => state.login);
  const isSubmitting = useAuthStore(state => state.isSubmitting);
  const errorMessage = useAuthStore(state => state.errorMessage);
  const setErrorMessage = useAuthStore(state => state.setErrorMessage);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
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

  async function submitLogin(values: LoginFormValues) {
    setErrorMessage(null);

    try {
      await login({
        ...values,
        returnTo
      });
      toast.success('登录成功，正在恢复原始上下文');
      onSuccess();
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : '登录失败，请稍后重试'
      });
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={event => {
        void handleSubmit(submitLogin)(event);
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="login-username">
          手机号 / 邮箱 / 用户名
        </label>
        <input
          {...register('username')}
          aria-describedby={errors.username ? 'login-username-error' : undefined}
          aria-invalid={Boolean(errors.username)}
          className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
          id="login-username"
          placeholder="例如：student_demo"
          type="text"
        />
        {errors.username ? (
          <p className="text-sm text-destructive" id="login-username-error" role="alert">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="login-password">
          密码
        </label>
        <input
          {...register('password')}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          aria-invalid={Boolean(errors.password)}
          className="w-full rounded-[var(--xm-radius-lg)] border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
          id="login-password"
          placeholder="请输入密码"
          type="password"
        />
        {errors.password ? (
          <p className="text-sm text-destructive" id="login-password-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

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
        <LogIn className="h-4 w-4" />
        {isSubmitting ? '登录中...' : '登录并继续'}
      </button>
    </form>
  );
}
