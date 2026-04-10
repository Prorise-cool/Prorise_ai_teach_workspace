/**
 * 文件说明：错误消息归一化。
 * 负责从后端错误负载中提取展示友好的错误消息。
 */
import { readRecord, readStringProperty } from "@/lib/type-guards";

/**
 * 从后端错误负载中提取更适合展示的错误消息。
 *
 * @param data - 错误响应体。
 * @param fallbackMessage - 默认兜底文案。
 * @returns 解析后的错误消息。
 */
export function parseErrorMessage(data: unknown, fallbackMessage: string) {
  const errorRecord = readRecord(data);
  const errorMessage = errorRecord
    ? readStringProperty(errorRecord, "msg")
    : undefined;

  if (errorMessage && errorMessage.trim().length > 0) {
    return errorMessage;
  }

  return fallbackMessage;
}
