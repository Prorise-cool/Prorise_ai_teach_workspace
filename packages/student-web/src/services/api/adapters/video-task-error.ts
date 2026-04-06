/**
 * 文件说明：抽离视频任务 adapter 错误类型，供 adapter 与 mock fixtures 共享。
 */
import { readBoolean, readNumber, readRecord, readString } from '@/lib/type-guards';

/** 视频任务 adapter 统一错误。 */
export class VideoTaskAdapterError extends Error {
  name = 'VideoTaskAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
    public requestId: string | null = null,
    public taskId: string | null = null,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 创建视频任务 adapter 错误。
 *
 * @param status - HTTP 状态码。
 * @param code - 业务错误码。
 * @param message - 错误消息。
 * @param extras - 额外错误字段。
 * @returns `VideoTaskAdapterError`。
 */
export function createVideoTaskAdapterError(
  status: number,
  code: string,
  message: string,
  extras: {
    retryable?: boolean;
    requestId?: string | null;
    taskId?: string | null;
    details?: Record<string, unknown>;
  } = {},
) {
  return new VideoTaskAdapterError(
    status,
    code,
    message,
    extras.retryable ?? false,
    extras.requestId ?? null,
    extras.taskId ?? null,
    extras.details ?? {},
  );
}

/**
 * 判断异常是否为视频任务 adapter 错误。
 *
 * @param error - 待判断异常。
 * @returns 是否为 `VideoTaskAdapterError`。
 */
export function isVideoTaskAdapterError(
  error: unknown,
): error is VideoTaskAdapterError {
  if (error instanceof VideoTaskAdapterError) {
    return true;
  }

  const candidate = readRecord(error);

  if (!candidate) {
    return false;
  }

  return (
    readString(candidate.name) === 'VideoTaskAdapterError' &&
    readNumber(candidate.status) !== undefined &&
    readString(candidate.code) !== undefined &&
    readBoolean(candidate.retryable) !== undefined
  );
}
