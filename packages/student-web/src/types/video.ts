/**
 * 文件说明：定义视频任务创建请求与响应的稳定领域类型。
 * 对齐 Story 3.1 冻结的 POST /api/v1/video/tasks 契约。
 */

/** 视频任务输入类型枚举。 */
export type VideoInputType = 'text' | 'image';

/**
 * 文本输入时的来源载荷。
 */
export interface VideoTextSourcePayload {
  /** 用户输入的题目文本。 */
  text: string;
}

/**
 * 图片输入时的来源载荷。
 */
export interface VideoImageSourcePayload {
  /** 图片引用地址（MVP 阶段为 ObjectURL 本地引用）。 */
  imageRef: string;
  /** 图片文件名。 */
  fileName: string;
  /** 图片大小（字节）。 */
  fileSize: number;
  /** 图片 MIME 类型。 */
  mimeType: string;
  /** OCR 辅助文本（可选）。 */
  ocrText?: string;
}

/** 视频任务来源载荷联合类型。 */
export type VideoSourcePayload = VideoTextSourcePayload | VideoImageSourcePayload;

/**
 * 创建视频任务的请求体。
 * 对应 POST /api/v1/video/tasks 的 body。
 */
export interface CreateVideoTaskRequest {
  /** 输入类型。 */
  inputType: VideoInputType;
  /** 输入来源载荷。 */
  sourcePayload: VideoSourcePayload;
}

/**
 * 创建视频任务成功后的响应数据。
 */
export interface CreateVideoTaskResult {
  /** 新创建的任务 ID。 */
  taskId: string;
  /** 请求追踪 ID。 */
  requestId: string | null;
  /** 任务状态（一般为 pending）。 */
  status: string;
  /** 创建时间。 */
  createdAt: string;
}

/**
 * 创建视频任务的标准响应信封。
 */
export interface CreateVideoTaskEnvelope {
  code: number;
  msg: string;
  data: CreateVideoTaskResult;
}
