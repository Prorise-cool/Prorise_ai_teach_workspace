/**
 * 文件说明：认证页验证码共享逻辑。
 * 统一处理验证码获取、刷新与加载状态，避免登录与注册表单重复维护同一套流程。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { getAuthFeedbackMessage } from '@/features/auth/shared/auth-feedback';
import type { AuthService } from '@/services/auth';

type CaptchaState = {
  captchaEnabled: boolean;
  imageBase64?: string;
  uuid?: string;
};

type UseAuthCaptchaOptions = {
  /** 认证服务。 */
  service: AuthService;
  /** bootstrap 失败时的默认文案。 */
  bootstrapErrorMessage: string;
  /** 回写表单级错误文案。 */
  onBootstrapError: (message: string) => void;
  /** 成功获取验证码后重置输入框内容。 */
  resetCode: () => void;
  /** 成功获取验证码后清理字段错误。 */
  clearCodeError: () => void;
};

/**
 * 提供认证页验证码状态与刷新动作。
 *
 * @param options - 验证码 hook 参数。
 * @returns 验证码状态、加载态与刷新方法。
 */
export function useAuthCaptcha({
  service,
  bootstrapErrorMessage,
  onBootstrapError,
  resetCode,
  clearCodeError,
}: UseAuthCaptchaOptions) {
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaState, setCaptchaState] = useState<CaptchaState>({
    captchaEnabled: false,
  });
  const callbacksRef = useRef({
    onBootstrapError,
    resetCode,
    clearCodeError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onBootstrapError,
      resetCode,
      clearCodeError,
    };
  }, [clearCodeError, onBootstrapError, resetCode]);

  const refreshCaptcha = useCallback(async () => {
    const {
      onBootstrapError: applyBootstrapError,
      resetCode: applyResetCode,
      clearCodeError: applyClearCodeError,
    } = callbacksRef.current;

    setCaptchaLoading(true);

    try {
      const nextCaptcha = await service.getCaptcha();

      setCaptchaState({
        captchaEnabled: nextCaptcha.captchaEnabled,
        imageBase64: nextCaptcha.imageBase64,
        uuid: nextCaptcha.uuid,
      });
      applyResetCode();
      applyClearCodeError();
    } catch (error) {
      setCaptchaState({ captchaEnabled: false });
      applyBootstrapError(
        getAuthFeedbackMessage(error, bootstrapErrorMessage)
      );
    } finally {
      setCaptchaLoading(false);
    }
  }, [bootstrapErrorMessage, service]);

  useEffect(() => {
    void refreshCaptcha();
  }, [refreshCaptcha]);

  return {
    captchaLoading,
    captchaState,
    refreshCaptcha,
  };
}
