/**
 * 文件说明：认证页注册表单。
 * 按 RuoYi 默认账密注册语义提交，不伪造前端自动登录。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LoaderCircle,
  Lock,
  LockKeyhole,
  UserRound
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AuthCaptchaField,
  AuthField,
  AuthPasswordField
} from '@/features/auth/components/auth-fields';
import type { AuthInteractionZone } from '@/features/auth/components/auth-scene';
import {
  createRegisterFormSchema,
  type RegisterFormValues
} from '@/features/auth/schemas/auth-form-schemas';
import {
  useAuthFieldCopy,
  useAuthPageCopy,
  registerFormDefaultValues
} from '@/features/auth/shared/auth-content';
import { getAuthFeedbackMessage } from '@/features/auth/shared/auth-feedback';
import type { AuthService } from '@/services/auth';
import { AUTH_DEFAULT_USER_TYPE } from '@/types/auth';

type RegisterFormProps = {
  service: AuthService;
  onRegistered: (username: string) => void;
  onSwitchToLogin: () => void;
  onSceneZoneChange: (zone: AuthInteractionZone) => void;
};

type CaptchaState = {
  captchaEnabled: boolean;
  imageBase64?: string;
  uuid?: string;
};

/**
 * 渲染注册表单，并处理字段校验、验证码和成功回登录。
 *
 * @param props - 注册表单参数。
 * @returns 注册表单节点。
 */
export function RegisterForm({
  service,
  onRegistered,
  onSwitchToLogin,
  onSceneZoneChange
}: RegisterFormProps) {
  const { t } = useAppTranslation();
  const authFieldCopy = useAuthFieldCopy();
  const authPageCopy = useAuthPageCopy();
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaState, setCaptchaState] = useState<CaptchaState>({
    captchaEnabled: false
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterFormSchema(t)),
    defaultValues: registerFormDefaultValues,
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
          message: t('auth.validation.register.codeRequired')
        });

        return;
      }

      if (!captchaState.uuid) {
        setFormError(t('auth.feedback.bootstrapFailed'));

        return;
      }
    }

    try {
      const submittedUsername = values.username.trim();

      await service.register({
        username: submittedUsername,
        password: values.password,
        confirmPassword: values.confirmPassword,
        code: captchaState.captchaEnabled ? values.code.trim() : undefined,
        uuid: captchaState.captchaEnabled ? captchaState.uuid : undefined,
        userType: AUTH_DEFAULT_USER_TYPE
      });

      onRegistered(submittedUsername);
    } catch (error) {
      if (captchaState.captchaEnabled) {
        await refreshCaptcha();
      }

      setFormError(
        getAuthFeedbackMessage(error, t('auth.feedback.registerFailed'))
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
        id="register-username"
        label={authFieldCopy.register.usernameLabel}
        placeholder={authFieldCopy.register.usernamePlaceholder}
        icon={<UserRound size={18} />}
        registration={register('username')}
        error={errors.username?.message}
        sceneZone="account"
        autoComplete="username"
        onSceneZoneChange={onSceneZoneChange}
      />

      <div className="xm-auth-form-row">
        <AuthPasswordField
          id="register-password"
          label={authFieldCopy.register.passwordLabel}
          placeholder={authFieldCopy.register.passwordPlaceholder}
          icon={<LockKeyhole size={18} />}
          registration={register('password')}
          error={errors.password?.message}
          autoComplete="new-password"
          onSceneZoneChange={onSceneZoneChange}
        />
        <AuthPasswordField
          id="register-confirm-password"
          label={authFieldCopy.register.confirmPasswordLabel}
          placeholder={authFieldCopy.register.confirmPasswordPlaceholder}
          icon={<Lock size={18} />}
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
          onSceneZoneChange={onSceneZoneChange}
        />
      </div>

      {captchaState.captchaEnabled ? (
        <AuthCaptchaField
          id="register-code"
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

      <Controller
        name="agreeToTerms"
        control={control}
        render={({ field }) => (
          <Label className="xm-auth-checkbox-label">
            <Checkbox
              name={field.name}
              checked={field.value}
              disabled={isSubmitting || captchaLoading}
              onBlur={field.onBlur}
              onCheckedChange={checked => {
                field.onChange(checked === true);
              }}
            />
            <span>{authPageCopy.agreement}</span>
          </Label>
        )}
      />
      {errors.agreeToTerms?.message ? (
        <p className="xm-auth-field-error" role="alert">
          {errors.agreeToTerms.message}
        </p>
      ) : null}

      <Button
        className="xm-auth-primary-btn"
        type="submit"
        disabled={isSubmitting || captchaLoading}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="xm-auth-spinner" size={18} />
            <span>{authPageCopy.registerSubmitting}</span>
          </>
        ) : (
          authPageCopy.registerSubmit
        )}
      </Button>

      <p className="xm-auth-helper-text">
        {authPageCopy.switchToLoginPrefix}{' '}
        <Button
          type="button"
          variant="link"
          className="xm-auth-inline-link"
          onClick={onSwitchToLogin}
        >
          {authPageCopy.switchToLoginAction}
        </Button>
      </p>
    </form>
  );
}
