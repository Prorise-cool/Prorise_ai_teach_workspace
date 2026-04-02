/**
 * 文件说明：提供 `unknown`、JSON 文本与基础字段读取的最小安全工具。
 * 统一收口浏览器接口返回的弱类型数据，避免业务层直接消费未收窄值。
 */

type TextReadableBody = Pick<Body, "text">;

/**
 * 判断值是否为普通对象记录。
 *
 * @param value - 待判断值。
 * @returns 是否为 `Record<string, unknown>`。
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 把未知值收窄为对象记录。
 *
 * @param value - 待收窄值。
 * @returns 对象记录；否则返回 `undefined`。
 */
export function readRecord(value: unknown) {
  return isRecord(value) ? value : undefined;
}

/**
 * 读取字符串值。
 *
 * @param value - 待读取值。
 * @returns 字符串；否则返回 `undefined`。
 */
export function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

/**
 * 读取数字值。
 *
 * @param value - 待读取值。
 * @returns 数字；否则返回 `undefined`。
 */
export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * 读取布尔值。
 *
 * @param value - 待读取值。
 * @returns 布尔值；否则返回 `undefined`。
 */
export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * 从对象记录中读取字符串字段。
 *
 * @param record - 已收窄的对象记录。
 * @param key - 字段名。
 * @returns 字符串字段值；否则返回 `undefined`。
 */
export function readStringProperty(
  record: Record<string, unknown>,
  key: string,
) {
  return readString(record[key]);
}

/**
 * 从对象记录中读取数字字段。
 *
 * @param record - 已收窄的对象记录。
 * @param key - 字段名。
 * @returns 数字字段值；否则返回 `undefined`。
 */
export function readNumberProperty(
  record: Record<string, unknown>,
  key: string,
) {
  return readNumber(record[key]);
}

/**
 * 从对象记录中读取布尔字段。
 *
 * @param record - 已收窄的对象记录。
 * @param key - 字段名。
 * @returns 布尔字段值；否则返回 `undefined`。
 */
export function readBooleanProperty(
  record: Record<string, unknown>,
  key: string,
) {
  return readBoolean(record[key]);
}

/**
 * 解析 JSON 文本并显式返回 `unknown`。
 *
 * @param text - JSON 文本。
 * @returns 解析后的未知值。
 */
export function parseJsonText(text: string): unknown {
  return JSON.parse(text) as unknown;
}

/**
 * 从浏览器 `Body` 对象中读取 JSON 负载。
 *
 * @param body - 支持 `text()` 的请求体或响应体。
 * @returns 解析后的未知值；空串返回 `null`。
 */
export async function readJsonBody(body: TextReadableBody): Promise<unknown> {
  const rawText = await body.text();

  if (rawText.length === 0) {
    return null;
  }

  return parseJsonText(rawText);
}
