/**
 * 文件说明：认证 adapter 层的错误类型与判断函数。
 */
import type { AuthError } from "@/types/auth";
import {
  readNumberProperty,
  readRecord,
  readStringProperty,
} from "@/lib/type-guards";
import { isApiClientError } from "@/services/api/client";

/** 可被 `instanceof` 判断的认证错误类型。 */
export class AuthAdapterError extends Error implements AuthError {
  name = "AuthError" as const;

  constructor(
    public status: number,
    code: number | string,
    message: string,
  ) {
    super(message);
    this.code = String(code);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  code: string;
}

/**
 * 创建统一认证错误对象，确保页面与 adapter 层可一致处理。
 *
 * @param status - HTTP 或领域状态码。
 * @param code - 后端返回的业务错误码。
 * @param message - 错误消息。
 * @returns 统一认证错误对象。
 */
export function createAuthError(
  status: number,
  code: number | string,
  message: string,
): AuthError {
  return new AuthAdapterError(status, code, message);
}

/**
 * 判断任意异常是否已归一为认证错误。
 *
 * @param error - 待判断的异常对象。
 * @returns 是否为认证错误。
 */
export function isAuthError(error: unknown): error is AuthError {
  if (error instanceof AuthAdapterError) {
    return true;
  }

  const errorRecord = readRecord(error);

  if (!errorRecord) {
    return false;
  }

  return (
    readStringProperty(errorRecord, "name") === "AuthError" &&
    readNumberProperty(errorRecord, "status") !== undefined &&
    readStringProperty(errorRecord, "code") !== undefined &&
    readStringProperty(errorRecord, "message") !== undefined
  );
}

/**
 * 把 API Client 层异常映射为认证领域错误。
 *
 * @param error - 原始异常对象。
 * @returns 统一认证错误。
 */
export function mapApiClientAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }

  if (isApiClientError(error)) {
    const responseData = readRecord(error.data);
    const responseCode =
      responseData?.code !== undefined
        ? readNumberProperty(responseData, "code")
        : undefined;
    const responseMessage = responseData
      ? readStringProperty(responseData, "msg")
      : undefined;
    const status = responseCode ?? error.status ?? 500;
    const code = responseCode ?? error.status ?? 500;
    const message =
      responseMessage && responseMessage.trim().length > 0
        ? responseMessage
        : error.message;

    return createAuthError(status, code, message);
  }

  if (error instanceof Error) {
    return createAuthError(500, 500, error.message);
  }

  return createAuthError(500, 500, "未知认证错误");
}
