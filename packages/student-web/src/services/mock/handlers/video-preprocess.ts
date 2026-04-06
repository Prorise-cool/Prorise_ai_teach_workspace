/**
 * 文件说明：提供视频预处理接口的 MSW handlers。
 */
import { http, HttpResponse } from "msw";

import type { PreprocessResult } from "@/services/api/adapters/video-preprocess-adapter";

type PreprocessResponseEnvelope = {
  code: number;
  msg: string;
  data: PreprocessResult;
};

const MOCK_SUCCESS_RESPONSE: PreprocessResponseEnvelope = {
  code: 200,
  msg: "预处理完成",
  data: {
    imageRef: "local://20260406/mock-image-001.jpg",
    ocrText:
      "已知函数 f(x) = 2x³ - 3x² + 1\n(1) 求 f(x) 的单调递增区间\n(2) 求 f(x) 在 [0, 2] 上的最大值和最小值",
    confidence: 0.92,
    width: 1280,
    height: 960,
    format: "jpeg",
    suggestions: [],
  },
};

export const videoPreprocessHandlers = [
  http.post("*/api/v1/video/preprocess", async ({ request }) => {
    // 模拟处理延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 检查是否为 multipart/form-data
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return HttpResponse.json(
        {
          code: 422,
          msg: "请求格式错误，需要 multipart/form-data",
          data: {
            error_code: "VIDEO_FILE_TYPE_INVALID",
            retryable: false,
            request_id: null,
            task_id: null,
            details: {},
          },
        },
        { status: 422 },
      );
    }

    return HttpResponse.json(MOCK_SUCCESS_RESPONSE, { status: 200 });
  }),
];
