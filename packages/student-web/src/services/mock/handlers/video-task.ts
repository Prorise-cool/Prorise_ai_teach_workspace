/**
 * 文件说明：视频任务创建的 MSW handler。
 * 拦截 POST /api/v1/video/tasks 请求，返回 mock 创建结果。
 */
import { http, HttpResponse } from 'msw';

let mockVideoTaskCounter = 0;

export const videoTaskHandlers = [
  http.post('*/api/v1/video/tasks', async ({ request }) => {
    /* 模拟网络延迟 */
    await new Promise((resolve) => setTimeout(resolve, 400));

    const body = (await request.json()) as Record<string, unknown> | null;

    if (!body || !body.inputType || !body.sourcePayload) {
      return HttpResponse.json(
        {
          code: 400,
          msg: '请求参数不完整，缺少 inputType 或 sourcePayload',
          data: null,
        },
        { status: 400 },
      );
    }

    mockVideoTaskCounter += 1;
    const taskId = `video_mock_${Date.now()}_${mockVideoTaskCounter}`;

    return HttpResponse.json(
      {
        code: 200,
        msg: '视频任务创建成功',
        data: {
          taskId,
          requestId: `req_${taskId}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  }),
];
