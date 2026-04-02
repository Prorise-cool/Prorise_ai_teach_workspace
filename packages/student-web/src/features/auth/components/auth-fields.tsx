/**
 * 文件说明：认证页基础输入组件。
 * 统一承接输入框前缀图标、错误反馈和插画联动焦点事件。
 */
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Eye, EyeOff, LoaderCircle, Shield } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import type { AuthInteractionZone } from '@/features/auth/components/auth-scene';

type BaseFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  icon: ReactNode;
  registration: UseFormRegisterReturn;
  error?: string;
  sceneZone?: Exclude<AuthInteractionZone, null>;
  onSceneZoneChange?: (zone: AuthInteractionZone) => void;
  autoComplete?: string;
  disabled?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  readOnly?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  trailing?: ReactNode;
};

/**
 * 把 React Hook Form 返回的 ref 赋给真实输入框节点。
 *
 * @param fieldRef - React Hook Form 注册返回的 ref。
 * @param element - 当前输入框节点。
 */
function assignInputRef(
  fieldRef: UseFormRegisterReturn['ref'],
  element: HTMLInputElement | null
) {
  fieldRef(element);
}

/**
 * 渲染认证页通用输入框，并接入错误展示与插画焦点联动。
 *
 * @param props - 输入框参数。
 * @returns 通用认证输入框节点。
 */
export function AuthField({
  id,
  label,
  placeholder,
  icon,
  registration,
  error,
  sceneZone,
  onSceneZoneChange,
  autoComplete,
  disabled,
  inputMode,
  readOnly,
  type = 'text',
  trailing
}: BaseFieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="xm-auth-form-group">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div
        className={cn(
          'xm-auth-input-wrapper',
          error && 'has-error',
          readOnly && 'is-readonly'
        )}
      >
        <span className="xm-auth-prefix">{icon}</span>
        <input
          id={id}
          ref={element => assignInputRef(registration.ref, element)}
          name={registration.name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={event => {
            void registration.onChange(event);
          }}
          onBlur={event => {
            void registration.onBlur(event);
            onSceneZoneChange?.(null);
          }}
          onFocus={() => {
            onSceneZoneChange?.(sceneZone ?? null);
          }}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} className="xm-auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AuthPasswordFieldProps = Omit<BaseFieldProps, 'type' | 'trailing'>;

type AuthCaptchaFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  imageBase64?: string;
  refreshLabel: string;
  unavailableLabel: string;
  onRefresh: () => void;
  onSceneZoneChange?: (zone: AuthInteractionZone) => void;
};

/**
 * 渲染认证页密码输入框，并提供显隐切换能力。
 *
 * @param props - 密码输入框参数。
 * @returns 密码输入框节点。
 */
export function AuthPasswordField({
  id,
  label,
  placeholder,
  icon,
  registration,
  error,
  onSceneZoneChange,
  autoComplete,
  disabled
}: AuthPasswordFieldProps) {
  const { t } = useAppTranslation();
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="xm-auth-form-group">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className={cn('xm-auth-input-wrapper', error && 'has-error')}>
        <span className="xm-auth-prefix">{icon}</span>
        <input
          id={id}
          ref={element => {
            inputRef.current = element;
            assignInputRef(registration.ref, element);
          }}
          name={registration.name}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={event => {
            void registration.onChange(event);
          }}
          onBlur={event => {
            void registration.onBlur(event);
            onSceneZoneChange?.(null);
          }}
          onFocus={() => {
            onSceneZoneChange?.(visible ? 'account' : 'sensitive');
          }}
        />
        <button
          type="button"
          className="xm-auth-input-icon-btn"
          aria-label={
            visible
              ? t('auth.accessibility.hidePassword')
              : t('auth.accessibility.showPassword')
          }
          aria-pressed={visible}
          onClick={() => {
            setVisible(currentVisible => {
              const nextVisible = !currentVisible;

              if (document.activeElement === inputRef.current) {
                onSceneZoneChange?.(nextVisible ? 'account' : 'sensitive');
              }

              return nextVisible;
            });
          }}
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="xm-auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 渲染认证页验证码输入框，并提供验证码图片刷新入口。
 *
 * @param props - 验证码输入框参数。
 * @returns 验证码输入框节点。
 */
export function AuthCaptchaField({
  id,
  label,
  placeholder,
  registration,
  error,
  disabled,
  loading,
  imageBase64,
  refreshLabel,
  unavailableLabel,
  onRefresh,
  onSceneZoneChange
}: AuthCaptchaFieldProps) {
  return (
    <AuthField
      id={id}
      label={label}
      placeholder={placeholder}
      icon={<Shield size={18} />}
      registration={registration}
      error={error}
      sceneZone="account"
      autoComplete="off"
      inputMode="text"
      disabled={disabled}
      onSceneZoneChange={onSceneZoneChange}
      trailing={
        <button
          type="button"
          className="xm-auth-captcha-trigger"
          aria-label={refreshLabel}
          disabled={disabled}
          onClick={onRefresh}
        >
          {loading ? (
            <LoaderCircle className="xm-auth-spinner" size={18} />
          ) : imageBase64 ? (
            <img
              className="xm-auth-captcha-image"
              src={`data:image/gif;base64,${imageBase64}`}
              alt={refreshLabel}
            />
          ) : (
            <span className="xm-auth-captcha-fallback">{unavailableLabel}</span>
          )}
        </button>
      }
    />
  );
}
