/**
 * 文件说明：提供视频预处理（图片上传 + OCR）的 mock / real adapter 抽象。
 *
 * 职责：封装 POST /api/v1/video/preprocess 接口调用与 mock 切换。
 * 边界：仅负责预处理接口的请求与响应映射，不涉及视频任务创建。
 */
import {
  createApiClient,
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { resolveFastapiBaseUrl } from '@/services/auth-consistency';

import { pickAdapterImplementation } from './base-adapter';

const fastapiClient = createApiClient({
  baseURL: resolveFastapiBaseUrl(),
});

// ── 类型定义 ──────────────────────────────────────────────────────

/** 预处理结果 */
export type PreprocessResult = {
  imageRef: string;
  ocrText: string | null;
  confidence: number;
  width: number;
  height: number;
  format: string;
  suggestions: string[];
};

/** 预处理响应信封 */
type PreprocessResponseEnvelope = {
  code: number;
  msg: string;
  data: PreprocessResult;
};

/** 预处理 adapter 接口 */
export interface VideoPreprocessAdapter {
  /**
   * 上传图片并执行预处理（校验 + 存储 + OCR）。
   *
   * @param file - 待上传的图片文件。
   * @param signal - 可选的取消信号。
   * @returns 预处理结果。
   * @throws VideoPreprocessAdapterError 校验或服务异常。
   */
  preprocessImage(file: File, signal?: AbortSignal): Promise<PreprocessResult>;
}

/** 预处理 adapter 统一错误 */
export class VideoPreprocessAdapterError extends Error {
  name = 'VideoPreprocessAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────

/**
 * 将底层 API Client 异常映射为预处理 adapter 错误。
 *
 * @param error - 原始异常。
 * @returns 统一预处理 adapter 错误。
 */
function mapPreprocessApiError(error: unknown): VideoPreprocessAdapterError {
  if (error instanceof VideoPreprocessAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | { code?: number | string; msg?: string; data?: { error_code?: string } }
      | undefined;
    const errorCode =
      payload?.data?.error_code ?? String(payload?.code ?? error.status);

    return new VideoPreprocessAdapterError(
      error.status,
      errorCode,
      payload?.msg ?? error.message,
    );
  }

  return new VideoPreprocessAdapterError(
    500,
    'PREPROCESS_UNKNOWN_ERROR',
    error instanceof Error ? error.message : '未知预处理错误',
  );
}

// ── Real Adapter ─────────────────────────────────────────────────

type RealAdapterOptions = {
  client?: ApiClient;
};

/**
 * 创建真实视频预处理 adapter。
 *
 * @param options - adapter 参数。
 * @returns 真实预处理 adapter。
 */
export function createRealVideoPreprocessAdapter(
  { client = fastapiClient }: RealAdapterOptions = {},
): VideoPreprocessAdapter {
  return {
    async preprocessImage(file, signal) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await client.request<PreprocessResponseEnvelope>({
          url: '/api/v1/video/preprocess',
          method: 'post',
          data: formData,
          signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapPreprocessApiError(error);
      }
    },
  };
}

// ── Mock Adapter ─────────────────────────────────────────────────

/**
 * 创建本地 mock 视频预处理 adapter。
 *
 * @returns mock 预处理 adapter。
 */
export function createMockVideoPreprocessAdapter(): VideoPreprocessAdapter {
  return {
    async preprocessImage() {
      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        imageRef: 'local://20260406/mock-image-001.jpg',
        ocrText:
          '已知函数 f(x) = 2x\u00b3 - 3x\u00b2 + 1\n(1) 求 f(x) 的单调递增区间\n(2) 求 f(x) 在 [0, 2] 上的最大值和最小值',
        confidence: 0.92,
        width: 1280,
        height: 960,
        format: 'jpeg',
        suggestions: [],
      };
    },
  };
}

// ── Adapter 解析 ─────────────────────────────────────────────────

type ResolveOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

/**
 * 根据运行模式选择 mock 或 real 视频预处理 adapter。
 *
 * @param options - adapter 解析参数。
 * @returns 当前运行模式对应的预处理 adapter。
 */
export function resolveVideoPreprocessAdapter(
  options: ResolveOptions = {},
): VideoPreprocessAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoPreprocessAdapter(),
      real: createRealVideoPreprocessAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    { useMock: options.useMock },
  );
}
