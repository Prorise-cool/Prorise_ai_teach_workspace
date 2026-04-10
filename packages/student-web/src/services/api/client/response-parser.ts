/**
 * 文件说明：响应体解析。
 * 负责根据响应头自动解密或解析 JSON、文本或空响应体。
 */
import {
  decryptBase64,
  decryptWithAes,
  decryptWithRsa,
  getRequestEncryptHeaderFlag,
  isRequestEncryptionEnabled,
  parseJsonText,
} from "./request-encryption";

/**
 * 根据响应头自动解析 JSON、文本或空响应体。
 *
 * @param response - Fetch 响应对象。
 * @returns 解析后的响应体。
 */
export async function parseResponseBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const encryptedKey = response.headers.get(getRequestEncryptHeaderFlag());

  if (isRequestEncryptionEnabled() && encryptedKey) {
    const encryptedText = await response.text();

    if (encryptedText.length === 0) {
      return null;
    }

    const decryptedAesKey = decryptBase64(decryptWithRsa(encryptedKey));
    const decryptedPayload = decryptWithAes(encryptedText, decryptedAesKey);

    if (decryptedPayload.length === 0) {
      return null;
    }

    return parseJsonText(decryptedPayload);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const rawJsonText = await response.text();

    if (rawJsonText.length === 0) {
      return null;
    }

    return parseJsonText(rawJsonText);
  }

  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return parseJsonText(text);
  } catch {
    return text;
  }
}
