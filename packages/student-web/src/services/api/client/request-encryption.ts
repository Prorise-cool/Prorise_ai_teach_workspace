/**
 * 文件说明：请求加解密辅助函数。
 * 负责判断是否需要加密、构造加密请求体。
 */
import {
  decryptBase64,
  decryptWithAes,
  decryptWithRsa,
  encryptBase64,
  encryptWithAes,
  encryptWithRsa,
  generateAesKey,
  getRequestEncryptHeaderFlag,
  isRequestEncryptionEnabled,
} from "@/services/api/request-crypto";
import { parseJsonText } from "@/lib/type-guards";

export type ApiRequestMethod = "get" | "post" | "put" | "patch" | "delete";

export function shouldEncryptRequest(
  method: ApiRequestMethod,
  encrypt: boolean | undefined,
) {
  return (
    encrypt === true &&
    isRequestEncryptionEnabled() &&
    (method === "post" || method === "put" || method === "patch")
  );
}

export function createEncryptedRequestBody(data: unknown) {
  const aesKey = generateAesKey();
  const encryptedKey = encryptWithRsa(encryptBase64(aesKey));
  const plainPayload =
    typeof data === "string" ? data : JSON.stringify(data ?? null);

  return {
    headerName: getRequestEncryptHeaderFlag(),
    headerValue: encryptedKey,
    body: encryptWithAes(plainPayload, aesKey),
  };
}

/**
 * 判断请求体是否应按 JSON 序列化发送。
 *
 * @param value - 待发送的请求体。
 * @returns 是否可以安全序列化为 JSON。
 */
export function isJsonSerializableBody(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return false;
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return false;
  }

  if (
    typeof URLSearchParams !== "undefined" &&
    value instanceof URLSearchParams
  ) {
    return false;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return false;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return false;
  }

  if (
    typeof ReadableStream !== "undefined" &&
    value instanceof ReadableStream
  ) {
    return false;
  }

  return true;
}

export {
  decryptBase64,
  decryptWithAes,
  decryptWithRsa,
  getRequestEncryptHeaderFlag,
  isRequestEncryptionEnabled,
  parseJsonText,
};
