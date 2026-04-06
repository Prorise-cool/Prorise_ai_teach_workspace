/**
 * 文件说明：定义视频任务创建的领域类型，复用统一任务公共类型。
 * Story 3.1 冻结：inputType、sourcePayload、创建请求/响应与视频域错误码。
 */

import type { TaskDataEnvelope } from '@/types/task';

/* ---------- 输入模态 ---------- */

/** 视频任务输入模态类型。 */
export const VIDEO_INPUT_TYPE_VALUES = ['text', 'image'] as const;

/** 视频任务输入模态联合类型。 */
export type VideoInputType = (typeof VIDEO_INPUT_TYPE_VALUES)[number];

/* ---------- 输入负载 ---------- */

/** 文本输入负载，inputType=text 时使用。 */
export interface VideoTextSourcePayload {
  text: string;
}

/** 图片输入负载，inputType=image 时使用。 */
export interface VideoImageSourcePayload {
  imageRef: string;
  ocrText?: string;
}

/** 输入负载联合类型。 */
export type VideoSourcePayload =
  | VideoTextSourcePayload
  | VideoImageSourcePayload;

/* ---------- 字段约束常量 ---------- */

/** 文本输入最小字符数。 */
export const VIDEO_TEXT_MIN_LENGTH = 10;

/** 文本输入最大字符数。 */
export const VIDEO_TEXT_MAX_LENGTH = 5000;

/** 图片最大体积（字节）。 */
export const VIDEO_IMAGE_MAX_SIZE_BYTES = 30 * 1024 * 1024;

/** 支持的图片 MIME 类型。 */
export const VIDEO_IMAGE_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** clientRequestId 最大长度。 */
export const VIDEO_CLIENT_REQUEST_ID_MAX_LENGTH = 128;

/* ---------- 请求 ---------- */

/** 文本模式视频任务创建请求。 */
export interface VideoTextTaskCreateRequest {
  inputType: 'text';
  sourcePayload: VideoTextSourcePayload;
  userProfile?: Record<string, unknown>;
  clientRequestId: string;
}

/** 图片模式视频任务创建请求。 */
export interface VideoImageTaskCreateRequest {
  inputType: 'image';
  sourcePayload: VideoImageSourcePayload;
  userProfile?: Record<string, unknown>;
  clientRequestId: string;
}

/** 视频任务创建请求。 */
export type VideoTaskCreateRequest =
  | VideoTextTaskCreateRequest
  | VideoImageTaskCreateRequest;

/* ---------- 响应 ---------- */

/** 视频任务创建成功数据。 */
export interface VideoTaskCreateResult {
  taskId: string;
  taskType: 'video';
  status: 'pending';
  createdAt: string;
}

/** 视频任务创建成功响应包。 */
export type VideoTaskCreateSuccessEnvelope =
  TaskDataEnvelope<VideoTaskCreateResult>;

/* ---------- 错误码 ---------- */

/** 视频域专属错误码。 */
export const VIDEO_ERROR_CODE_VALUES = [
  'VIDEO_INPUT_EMPTY',
  'VIDEO_INPUT_TOO_LONG',
  'VIDEO_IMAGE_FORMAT_INVALID',
  'VIDEO_IMAGE_TOO_LARGE',
  'VIDEO_IMAGE_UNREADABLE',
  'VIDEO_OCR_FAILED',
  'VIDEO_OCR_EMPTY',
  'VIDEO_OCR_TIMEOUT',
  'VIDEO_STORAGE_FAILED',
  'VIDEO_DISPATCH_FAILED',
] as const;

/** 视频域错误码类型。 */
export type VideoErrorCode = (typeof VIDEO_ERROR_CODE_VALUES)[number];

/** 视频任务创建错误详情。 */
export interface VideoTaskCreateError {
  errorCode: string;
  retryable: boolean;
  requestId: string | null;
  taskId: string | null;
  details: Record<string, unknown>;
}

/** 视频任务创建错误响应包。 */
export interface VideoTaskCreateErrorEnvelope {
  code: number;
  msg: string;
  data: VideoTaskCreateError;
}

/* ---------- Mock 场景 ---------- */

/** 视频任务创建 mock 场景。 */
export const VIDEO_TASK_MOCK_SCENARIO_VALUES = [
  'text-success',
  'image-success',
  'validation-error',
  'permission-denied',
] as const;

/** 视频任务创建 mock 场景类型。 */
export type VideoTaskMockScenario =
  (typeof VIDEO_TASK_MOCK_SCENARIO_VALUES)[number];

/**
 * 判断值是否为受支持的视频任务创建 mock 场景。
 *
 * @param value - 待判断值。
 * @returns 是否为 `VideoTaskMockScenario`。
 */
export function isVideoTaskMockScenario(
  value: unknown,
): value is VideoTaskMockScenario {
  return VIDEO_TASK_MOCK_SCENARIO_VALUES.some((s) => s === value);
}

/* ---------- 预处理 ---------- */

/** 视频图片预处理结果。 */
export interface VideoPreprocessResult {
  imageRef: string;
  ocrText: string | null;
  confidence: number;
  width: number;
  height: number;
  format: 'jpeg' | 'png' | 'webp';
  suggestions: string[];
  errorCode: 'VIDEO_OCR_FAILED' | 'VIDEO_OCR_EMPTY' | 'VIDEO_OCR_TIMEOUT' | null;
}

/** 视频图片预处理成功响应包。 */
export type VideoPreprocessSuccessEnvelope = TaskDataEnvelope<VideoPreprocessResult>;

/** 视频图片预处理错误响应。 */
export interface VideoPreprocessErrorEnvelope {
  code: number;
  msg: string;
  data: VideoTaskCreateError;
}

/** 视频图片预处理 mock 场景。 */
export const VIDEO_PREPROCESS_MOCK_SCENARIO_VALUES = [
  'success',
  'ocr-low-confidence',
  'ocr-failed',
  'ocr-timeout',
  'validation-error',
] as const;

/** 视频图片预处理 mock 场景类型。 */
export type VideoPreprocessMockScenario =
  (typeof VIDEO_PREPROCESS_MOCK_SCENARIO_VALUES)[number];

/**
 * 判断值是否为受支持的视频图片预处理 mock 场景。
 *
 * @param value - 待判断值。
 * @returns 是否为 `VideoPreprocessMockScenario`。
 */
export function isVideoPreprocessMockScenario(
  value: unknown,
): value is VideoPreprocessMockScenario {
  return VIDEO_PREPROCESS_MOCK_SCENARIO_VALUES.some((scenario) => scenario === value);
}
