/**
 * 文件说明：提供视频图片预处理的 mock fixtures。
 */
import { readBoolean, readNumber, readRecord, readString } from '@/lib/type-guards';
import type {
  VideoPreprocessErrorEnvelope,
  VideoPreprocessMockScenario,
  VideoPreprocessResult,
  VideoPreprocessSuccessEnvelope,
} from '@/types/video';

const PREPROCESS_TIMESTAMP_PREFIX = '20260406';

type VideoPreprocessFixtureError = {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  details: Record<string, unknown>;
};

function buildImageRef(suffix: string) {
  return `local://${PREPROCESS_TIMESTAMP_PREFIX}/${suffix}`;
}

const preprocessSuccessFixture: VideoPreprocessSuccessEnvelope = {
  code: 200,
  msg: '预处理完成',
  data: {
    imageRef: buildImageRef('mock-preprocess-success.jpg'),
    ocrText: '已知函数 f(x) = 2x^3 - 3x^2 + 1，求其单调区间。',
    confidence: 0.92,
    width: 1280,
    height: 960,
    format: 'jpeg',
    suggestions: [],
    errorCode: null,
  },
};

const preprocessLowConfidenceFixture: VideoPreprocessSuccessEnvelope = {
  code: 200,
  msg: '预处理完成',
  data: {
    imageRef: buildImageRef('mock-preprocess-low-confidence.jpg'),
    ocrText: '已知 f(x)=x^2+2x+1，求 f(3)',
    confidence: 0.45,
    width: 1024,
    height: 768,
    format: 'png',
    suggestions: ['OCR 识别置信度较低，建议核对识别结果并补充修正'],
    errorCode: null,
  },
};

const preprocessOcrFailedFixture: VideoPreprocessSuccessEnvelope = {
  code: 200,
  msg: '预处理完成',
  data: {
    imageRef: buildImageRef('mock-preprocess-failed.jpg'),
    ocrText: null,
    confidence: 0,
    width: 1024,
    height: 768,
    format: 'png',
    suggestions: ['OCR 识别失败，建议手动输入题目文本'],
    errorCode: 'VIDEO_OCR_FAILED',
  },
};

const preprocessOcrTimeoutFixture: VideoPreprocessSuccessEnvelope = {
  code: 200,
  msg: '预处理完成',
  data: {
    imageRef: buildImageRef('mock-preprocess-timeout.webp'),
    ocrText: null,
    confidence: 0,
    width: 1024,
    height: 768,
    format: 'webp',
    suggestions: ['OCR 识别超时，建议手动输入题目文本'],
    errorCode: 'VIDEO_OCR_TIMEOUT',
  },
};

const preprocessValidationErrorFixture: VideoPreprocessErrorEnvelope = {
  code: 422,
  msg: '不支持的文件类型，仅支持 JPG、PNG、WebP',
  data: {
    errorCode: 'VIDEO_IMAGE_FORMAT_INVALID',
    retryable: false,
    requestId: null,
    taskId: null,
    details: {
      field: 'file',
      allowed: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },
};

export const videoPreprocessMockFixtures = {
  success: {
    default: preprocessSuccessFixture,
    lowConfidence: preprocessLowConfidenceFixture,
    ocrFailed: preprocessOcrFailedFixture,
    ocrTimeout: preprocessOcrTimeoutFixture,
  },
  errors: {
    validationError: {
      status: 422,
      code: 'VIDEO_IMAGE_FORMAT_INVALID',
      message: preprocessValidationErrorFixture.msg,
      retryable: false,
      details: preprocessValidationErrorFixture.data.details,
    } satisfies VideoPreprocessFixtureError,
  },
} as const;

/**
 * 根据场景返回预处理成功响应。
 *
 * @param scenario - 预处理 mock 场景。
 * @param file - 可选文件，用于生成动态 imageRef。
 * @returns 预处理成功响应。
 */
export function getMockVideoPreprocessSuccess(
  scenario: Exclude<VideoPreprocessMockScenario, 'validation-error'> = 'success',
  file?: File,
): VideoPreprocessSuccessEnvelope {
  const base =
    scenario === 'ocr-low-confidence'
      ? preprocessLowConfidenceFixture
      : scenario === 'ocr-failed'
        ? preprocessOcrFailedFixture
        : scenario === 'ocr-timeout'
          ? preprocessOcrTimeoutFixture
          : preprocessSuccessFixture;

  if (!file) {
    return base;
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    : 'jpg';

  return {
    ...base,
    data: {
      ...base.data,
      imageRef: buildImageRef(`${Date.now().toString(36)}.${extension}`),
      format: extension === 'png' ? 'png' : extension === 'webp' ? 'webp' : 'jpeg',
    },
  };
}

/**
 * 根据场景返回预处理错误响应。
 *
 * @param scenario - 错误场景。
 * @returns 预处理错误响应。
 */
export function getMockVideoPreprocessError(
  scenario: 'validation-error',
): VideoPreprocessErrorEnvelope {
  void scenario;
  return preprocessValidationErrorFixture;
}

/**
 * 根据场景获取 fixture 错误信息。
 *
 * @param scenario - 预处理场景。
 * @returns 规范化错误对象或 `null`。
 */
export function getVideoPreprocessFixtureError(
  scenario: VideoPreprocessMockScenario | undefined,
): VideoPreprocessFixtureError | null {
  if (scenario === 'validation-error') {
    return videoPreprocessMockFixtures.errors.validationError;
  }

  return null;
}

/**
 * 规范化预处理 mock 错误对象。
 *
 * @param error - 原始错误。
 * @returns 规范化后的错误对象。
 */
export function normalizeMockVideoPreprocessError(
  error: unknown,
): VideoPreprocessFixtureError {
  const candidate = readRecord(error);

  if (candidate) {
    const status = readNumber(candidate.status);
    const code = readString(candidate.code);
    const message = readString(candidate.message);
    const retryable = readBoolean(candidate.retryable);
    const details = readRecord(candidate.details);

    if (
      status !== undefined &&
      code !== undefined &&
      message !== undefined &&
      retryable !== undefined
    ) {
      return {
        status,
        code,
        message,
        retryable,
        details: details ?? {},
      };
    }
  }

  return {
    status: 500,
    code: 'VIDEO_PREPROCESS_UNKNOWN_ERROR',
    message:
      error instanceof Error ? error.message : '未知图片预处理错误',
    retryable: false,
    details: {},
  };
}

/**
 * 构建与运行态一致的预处理结果。
 *
 * @param result - 成功 payload。
 * @returns 业务结果对象。
 */
export function toVideoPreprocessResult(
  result: VideoPreprocessSuccessEnvelope,
): VideoPreprocessResult {
  return result.data;
}
