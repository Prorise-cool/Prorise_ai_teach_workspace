/**
 * 文件说明：第三方登录回调页。
 * 负责消费 OAuth 回调参数、建立会话并恢复前端侧暂存的回跳上下文。
 */
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAppTranslation } from "@/app/i18n/use-app-translation";
import { resolvePostAuthDestination } from "@/features/profile/api/profile-api";
import { getAuthFeedbackMessage } from "@/features/auth/shared/auth-feedback";
import {
	parseJsonText,
	readRecord,
	readStringProperty,
} from "@/lib/type-guards";
import {
	authService,
	clearSocialAuthReturnTo,
	readSocialAuthReturnTo,
	type AuthService,
} from "@/services/auth";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import {
	AUTH_DEFAULT_TENANT_ID,
	AUTH_LOGIN_PATH,
	isAuthSocialSource,
} from "@/types/auth";

import '@/features/auth/styles/login-page.scss';

type SocialCallbackPageProps = {
  service?: AuthService;
};

type SocialStatePayload = {
  tenantId?: string;
  domain?: string;
};

/**
 * 解码第三方登录回调中的 `state` 参数。
 *
 * @param rawState - 回调地址里的 Base64 state。
 * @returns 可消费的状态对象；无法解析时返回空对象。
 */
function decodeSocialState(rawState: string | null): SocialStatePayload {
  if (!rawState) {
    return {};
  }

  try {
    const decodedState = window.atob(rawState);
    const stateRecord = readRecord(parseJsonText(decodedState));

    if (!stateRecord) {
      return {};
    }

    return {
      tenantId: readStringProperty(stateRecord, "tenantId"),
      domain: readStringProperty(stateRecord, "domain"),
    };
  } catch {
    return {};
  }
}

/**
 * 判断来源字符串是否为支持的第三方登录源。
 *
 * @param value - URL 中读取到的来源值。
 * @returns 归一化后的登录来源；非法时返回 `undefined`。
 */
function resolveSocialSource(value: string | null) {
  if (isAuthSocialSource(value)) {
    return value;
  }

  return undefined;
}

/**
 * 渲染第三方登录回调页，并在成功后写入会话与执行前端回跳。
 *
 * @param props - 页面参数。
 * @returns 第三方登录回调页节点。
 */
export function SocialCallbackPage({
  service = authService,
}: SocialCallbackPageProps) {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthSessionStore((state) => state.setSession);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    /**
     * 执行第三方登录回调换会话流程。
     */
    async function finishSocialLogin() {
      const socialCode = searchParams.get("code");
      const socialState = searchParams.get("state");
      const source = resolveSocialSource(searchParams.get("source"));
      const statePayload = decodeSocialState(socialState);

      if (!socialCode || !socialState || !source) {
        setStatusMessage(t("auth.feedback.socialMissingParams"));
        clearSocialAuthReturnTo();
        window.setTimeout(() => {
          void navigate(AUTH_LOGIN_PATH, { replace: true });
        }, 1200);

        return;
      }

      try {
        const session = await service.login({
          grantType: "social",
          source,
          socialCode,
          socialState,
          tenantId: statePayload.tenantId ?? AUTH_DEFAULT_TENANT_ID,
        });

        if (!isActive) {
          return;
        }

        const pendingReturnTo = readSocialAuthReturnTo();
        const nextPath = await resolvePostAuthDestination({
          userId: session.user.id,
          accessToken: session.accessToken,
          returnTo: pendingReturnTo ?? undefined
        });

        clearSocialAuthReturnTo();
        setSession(session);
        setStatusMessage(t("auth.feedback.socialSuccessRedirect"));
        void navigate(nextPath, {
          replace: true,
          state: null
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        clearSocialAuthReturnTo();
        setStatusMessage(
          getAuthFeedbackMessage(error, t("auth.feedback.socialFailed")),
        );
        window.setTimeout(() => {
          void navigate(AUTH_LOGIN_PATH, { replace: true });
        }, 1200);
      }
    }

    void finishSocialLogin();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams, service, setSession, t]);

  return (
    <main className="xm-auth-page xm-auth-callback-page">
      <section className="xm-auth-callback-card" aria-live="polite">
        <LoaderCircle
          className="xm-auth-spinner xm-auth-callback-spinner"
          size={28}
        />
        <h1 className="xm-auth-callback-title">
          {t("auth.feedback.socialCallbackTitle")}
        </h1>
        <p className="xm-auth-callback-message">
          {statusMessage ?? t("auth.feedback.socialProcessing")}
        </p>
      </section>
    </main>
  );
}
