/**
 * 文件说明：统一解析认证回跳来源并提供认证后的导航动作。
 * 该 hook 只处理 returnTo 读写与安全归一化，不承接表单或页面状态。
 */
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { AUTH_RETURN_TO_KEY, normalizeReturnTo } from "@/services/auth";
import { isRecord, readStringProperty } from "@/lib/type-guards";
import { DEFAULT_AUTH_RETURN_TO } from "@/types/auth";

/**
 * 把路由状态中的字符串或 location-like 对象归一成路径字符串。
 *
 * @param value - 可能来自路由状态的回跳目标。
 * @returns 归一后的路径字符串；无法解析时返回 `undefined`。
 */
function toPathname(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return `${readStringProperty(value, "pathname") ?? ""}${readStringProperty(value, "search") ?? ""}${readStringProperty(value, "hash") ?? ""}`;
}

/**
 * 从路由 `state` 中读取回跳目标，兼容 `returnTo` 与 `from` 两种写法。
 *
 * @param state - React Router location state。
 * @returns 提取到的回跳路径；不存在时返回 `undefined`。
 */
function readReturnToFromState(state: unknown) {
  if (!isRecord(state)) {
    return undefined;
  }

  return readStringProperty(state, "returnTo") ?? toPathname(state.from);
}

/**
 * 统一解析认证回跳地址，并应用站内白名单归一化规则。
 *
 * @param rawReturnTo - URL 查询中的原始回跳地址。
 * @param state - 路由状态对象。
 * @returns 安全可用的站内回跳路径。
 */
export function resolveAuthReturnTo(
  rawReturnTo: string | null | undefined,
  state?: unknown,
) {
  return normalizeReturnTo(
    rawReturnTo ?? readReturnToFromState(state),
    DEFAULT_AUTH_RETURN_TO,
  );
}

/**
 * 提供认证页读取、取消与执行回跳的统一行为。
 *
 * @returns 回跳目标及相关操作方法。
 */
export function useAuthRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = useMemo(() => {
    return resolveAuthReturnTo(
      searchParams.get(AUTH_RETURN_TO_KEY),
      location.state,
    );
  }, [location.state, searchParams]);

  const hasPendingReturnTo = returnTo !== DEFAULT_AUTH_RETURN_TO;

  const cancelReturnTo = useCallback(() => {
    void navigate(DEFAULT_AUTH_RETURN_TO, {
      replace: true,
      state: null,
    });
  }, [navigate]);

  const redirectAfterAuth = useCallback(
    (overrideReturnTo?: string) => {
      void navigate(
        normalizeReturnTo(overrideReturnTo ?? returnTo, DEFAULT_AUTH_RETURN_TO),
        {
          replace: true,
          state: null,
        },
      );
    },
    [navigate, returnTo],
  );

  return {
    returnTo,
    hasPendingReturnTo,
    cancelReturnTo,
    redirectAfterAuth,
  };
}
