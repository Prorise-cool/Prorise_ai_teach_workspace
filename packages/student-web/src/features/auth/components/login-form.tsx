/**
 * 文件说明：认证页登录表单。
 * 负责真实账密登录、验证码加载与失败反馈。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  AuthCaptchaField,
  AuthField,
  AuthPasswordField
} from '@/features/auth/components/auth-fields';
import type { AuthInteractionZone } from '@/features/auth/components/auth-scene';
import {
  createLoginFormSchema,
  type LoginFormValues
} from '@/features/auth/schemas/auth-form-schemas';
import {
  useAuthFieldCopy,
  useAuthPageCopy,
  loginFormDefaultValues
} from '@/features/auth/shared/auth-content';
import {
  getAuthFeedbackMessage,
  isCredentialFailure
} from '@/features/auth/shared/auth-feedback';
import type { AuthService } from '@/services/auth';
import type { AuthSession } from '@/types/auth';

type LoginFormProps = {
  service: AuthService;
  returnTo: string;
  canRegister: boolean;
  initialUsername?: string;
  onAuthenticated: (session: AuthSession) => void;
  onSwitchToRegister: () => void;
  onSceneZoneChange: (zone: AuthInteractionZone) => void;
};

type CaptchaState = {
  captchaEnabled: boolean;
  imageBase64?: string;
  uuid?: string;
};

/**
 * 渲染登录表单，并处理账密登录、验证码与失败反馈。
 *
 * @param props - 登录表单参数。
 * @returns 登录表单节点。
 */
export function LoginForm({
  service,
  returnTo,
  canRegister,
  initialUsername,
  onAuthenticated,
  onSwitchToRegister,
  onSceneZoneChange
}: LoginFormProps) {
  const { t } = useAppTranslation();
  const authFieldCopy = useAuthFieldCopy();
  const authPageCopy = useAuthPageCopy();
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaState, setCaptchaState] = useState<CaptchaState>({
    captchaEnabled: false
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginFormSchema(t)),
    defaultValues: {
      ...loginFormDefaultValues,
      username: initialUsername ?? loginFormDefaultValues.username
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);

    try {
      const nextCaptcha = await service.getCaptcha();

      setCaptchaState({
        captchaEnabled: nextCaptcha.captchaEnabled,
        imageBase64: nextCaptcha.imageBase64,
        uuid: nextCaptcha.uuid
      });
      setValue('code', '');
      clearErrors('code');
    } catch (error) {
      setCaptchaState({ captchaEnabled: false });
      setFormError(
        getAuthFeedbackMessage(error, t('auth.feedback.bootstrapFailed'))
      );
    } finally {
      setCaptchaLoading(false);
    }
  }, [clearErrors, service, setValue, t]);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  const submitForm = handleSubmit(async values => {
    setFormError(null);

    if (captchaState.captchaEnabled) {
      if (!values.code.trim()) {
        setError('code', {
          type: 'manual',
          message: t('auth.validation.login.codeRequired')
        });

        return;
      }

      if (!captchaState.uuid) {
        setFormError(t('auth.feedback.bootstrapFailed'));

        return;
      }
    }

    try {
      const session = await service.login({
        username: values.username.trim(),
        password: values.password,
        code: captchaState.captchaEnabled ? values.code.trim() : undefined,
        uuid: captchaState.captchaEnabled ? captchaState.uuid : undefined,
        returnTo
      });

      onAuthenticated(session);
    } catch (error) {
      if (captchaState.captchaEnabled) {
        await refreshCaptcha();
      }

      if (isCredentialFailure(error)) {
        setError('password', {
          type: 'server',
          message: t('auth.feedback.invalidCredentials')
        });

        setFormError(null);

        return;
      }

      setFormError(
        getAuthFeedbackMessage(error, t('auth.feedback.loginFailed'))
      );
    }
  });

  return (
    <form
      className="xm-auth-form-stack"
      noValidate
      onSubmit={event => {
        void submitForm(event);
      }}
    >
      {formError ? (
        <div className="xm-auth-form-error" role="alert">
          {formError}
        </div>
      ) : null}

      <AuthField
        id="login-username"
        label={authFieldCopy.login.usernameLabel}
        placeholder={authFieldCopy.login.usernamePlaceholder}
        icon={<UserRound size={18} />}
        registration={register('username')}
        error={errors.username?.message}
        sceneZone="account"
        autoComplete="username"
        onSceneZoneChange={onSceneZoneChange}
      />

      <AuthPasswordField
        id="login-password"
        label={authFieldCopy.login.passwordLabel}
        placeholder={authFieldCopy.login.passwordPlaceholder}
        icon={<LockKeyhole size={18} />}
        registration={register('password')}
        error={errors.password?.message}
        autoComplete="current-password"
        onSceneZoneChange={onSceneZoneChange}
      />

      {captchaState.captchaEnabled ? (
        <AuthCaptchaField
          id="login-code"
          label={authFieldCopy.common.codeLabel}
          placeholder={authFieldCopy.common.codePlaceholder}
          registration={register('code')}
          error={errors.code?.message}
          disabled={isSubmitting}
          loading={captchaLoading}
          imageBase64={captchaState.imageBase64}
          refreshLabel={authPageCopy.captchaRefresh}
          unavailableLabel={authPageCopy.captchaUnavailable}
          onRefresh={() => {
            void refreshCaptcha();
          }}
          onSceneZoneChange={onSceneZoneChange}
        />
      ) : null}

      <label className="xm-auth-checkbox-label">
        <input type="checkbox" {...register('rememberSession')} />
        <span>{authPageCopy.rememberSession}</span>
      </label>

      <button
        className="xm-auth-primary-btn"
        type="submit"
        disabled={isSubmitting || captchaLoading}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="xm-auth-spinner" size={18} />
            <span>{authPageCopy.loginSubmitting}</span>
          </>
        ) : (
          authPageCopy.loginSubmit
        )}
      </button>

      {canRegister ? (
        <p className="xm-auth-helper-text">
          {authPageCopy.switchToRegisterPrefix}{' '}
          <button
            type="button"
            className="xm-auth-inline-link"
            onClick={onSwitchToRegister}
          >
            {authPageCopy.switchToRegisterAction}
          </button>
        </p>
      ) : null}
    </form>
  );
}
