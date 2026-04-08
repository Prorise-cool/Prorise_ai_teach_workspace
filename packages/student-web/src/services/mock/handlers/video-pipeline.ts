/**
 * 文件说明：提供视频流水线 SSE stage 流、任务状态查询与结果查询的 MSW handlers。
 * Story 4.1：拦截视频 pipeline 相关端点，消费 mock fixtures 返回预期 payload。
 */
import { http, HttpResponse } from 'msw';

import type { TaskEventPayload } from '@/types/task';
import { isVideoPipelineMockScenario } from '@/types/video';
import type { VideoPipelineMockScenario } from '@/types/video';

import {
  getMockVideoFailure,
  getMockVideoResult,
  getVideoPipelineEventSequence,
} from '@/services/mock/fixtures/video-pipeline';

/**
 * 从请求 URL 中提取视频流水线 mock 场景。
 *
 * @param request - MSW 拦截的请求对象。
 * @returns 流水线 mock 场景或 null。
 */
function readPipelineScenario(request: Request): VideoPipelineMockScenario | null {
  const url = new URL(request.url);
  const scenario = url.searchParams.get('scenario');

  return isVideoPipelineMockScenario(scenario) ? scenario : null;
}

/**
 * 将 SSE 事件序列编码为 text/event-stream 格式。
 *
 * @param events - SSE 事件序列。
 * @returns 编码后的 SSE 文本。
 */
function encodeSSEEvents(events: TaskEventPayload[]): string {
  const connected: TaskEventPayload = {
    event: 'connected',
    taskId: events[0]?.taskId ?? 'mock_task',
    requestId: events[0]?.requestId ?? 'mock_req',
    taskType: 'video',
    status: 'pending',
    progress: 0,
    message: 'SSE mock 已建立连接',
    timestamp: new Date().toISOString(),
  };

  const allEvents = [connected, ...events];

  return allEvents
    .map(
      (event, index) =>
        `id: ${event.taskId}:evt:${String(index + 1).padStart(6, '0')}\nevent: ${event.event}\ndata: ${JSON.stringify({ ...event, id: `${event.taskId}:evt:${String(index + 1).padStart(6, '0')}`, sequence: index + 1 })}\n\n`,
    )
    .join('');
}

/**
 * 根据 taskId 前缀或场景参数推断流水线场景。
 *
 * @param taskId - 任务 ID。
 * @param explicitScenario - 显式指定的场景。
 * @returns 流水线场景。
 */
function inferPipelineScenario(
  taskId: string,
  explicitScenario: VideoPipelineMockScenario | null,
): VideoPipelineMockScenario {
  if (explicitScenario) {
    return explicitScenario;
  }

  if (taskId.includes('fix')) {
    return 'fix';
  }

  if (taskId.includes('fail')) {
    return 'failure';
  }

  return 'success';
}

/** 视频流水线 mock handlers 列表。 */
export const videoPipelineHandlers = [
  /* ── SSE 事件流 ── */
  http.get('*/api/v1/video/tasks/:taskId/events', ({ params, request }) => {
    const taskId = String(params.taskId);
    const scenario = inferPipelineScenario(taskId, readPipelineScenario(request));
    const events = getVideoPipelineEventSequence(scenario, taskId);
    const body = encodeSSEEvents(events);

    return new HttpResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }),

  /* ── 任务状态查询 ── */
  http.get('*/api/v1/video/tasks/:taskId/status', ({ params, request }) => {
    try {
      const taskId = String(params.taskId);
      const scenario = inferPipelineScenario(taskId, readPipelineScenario(request));
      const events = getVideoPipelineEventSequence(scenario, taskId);

      // 取最后一个事件作为当前状态快照
      const lastEvent = events[events.length - 1];

      if (!lastEvent) {
        return HttpResponse.json(
          { code: 404, msg: '任务不存在', data: null },
          { status: 404 },
        );
      }

      /* SSE 事件中的视频专属扩展字段通过 unknown 中转读取 */
      const raw = lastEvent as unknown as Record<string, unknown>;

      const snapshot = {
        taskId,
        requestId: lastEvent.requestId,
        taskType: 'video',
        status: lastEvent.status,
        progress: lastEvent.progress,
        message: lastEvent.message,
        timestamp: lastEvent.timestamp,
        errorCode: lastEvent.errorCode ?? null,
        currentStage: (raw.currentStage as string) ?? null,
        stageLabel: (raw.stageLabel as string) ?? null,
        stageProgress: (raw.stageProgress as number) ?? null,
      };

      return HttpResponse.json(
        { code: 200, msg: '获取任务状态成功', data: snapshot },
        { status: 200 },
      );
    } catch (err) {
      console.error('[mock] video status handler error:', err);
      return HttpResponse.json(
        { code: 500, msg: String(err), data: null },
        { status: 500 },
      );
    }
  }),

  /* ── 视频任务结果查询 ── */
  http.get('*/api/v1/video/tasks/:taskId', ({ params, request }) => {
    try {
      const taskId = String(params.taskId);
      const scenario = inferPipelineScenario(taskId, readPipelineScenario(request));

      if (scenario === 'failure') {
        const failure = getMockVideoFailure(taskId);

        return HttpResponse.json(
          {
            code: 200,
            msg: '获取任务结果成功',
            data: {
              taskId,
              taskType: 'video',
              status: 'failed',
              progress: 70,
              message: failure.errorMessage,
              timestamp: failure.failedAt,
              errorCode: failure.errorCode,
              result: null,
              failure,
            },
          },
          { status: 200 },
        );
      }

      const result = getMockVideoResult(taskId);

      return HttpResponse.json(
        {
          code: 200,
          msg: '获取任务结果成功',
          data: {
            taskId,
            taskType: 'video',
            status: 'completed',
            progress: 100,
            message: '视频生成完成',
            timestamp: result.completedAt,
            errorCode: null,
            result,
            failure: null,
          },
        },
        { status: 200 },
      );
    } catch (err) {
      console.error('[mock] video result handler error:', err);
      return HttpResponse.json(
        { code: 500, msg: String(err), data: null },
        { status: 500 },
      );
    }
  }),
];
