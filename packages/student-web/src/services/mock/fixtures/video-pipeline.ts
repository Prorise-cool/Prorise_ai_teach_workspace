/**
 * 文件说明：提供视频流水线 SSE stage 流、状态查询与结果查询的 mock fixture。
 * Story 4.1：消费 mocks/video/v1/ 下的 pipeline-stages 和 video-result 样例数据。
 */
import type { TaskEventPayload } from '@/types/task';
import type {
  VideoFailure,
  VideoPipelineMockScenario,
  VideoResult,
} from '@/types/video';

import successFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.success-flow.json';
import fixFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.fix-flow.json';
import failureFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.failure-flow.json';
import videoResultSuccessJson from '../../../../../../mocks/video/v1/video-result.success.json';
import videoResultFailureJson from '../../../../../../mocks/video/v1/video-result.failure.json';

/* ---------- SSE 事件序列 ---------- */

const SSE_FLOW_MAP: Record<VideoPipelineMockScenario, TaskEventPayload[]> = {
  success: successFlowJson as unknown as TaskEventPayload[],
  fix: fixFlowJson as unknown as TaskEventPayload[],
  failure: failureFlowJson as unknown as TaskEventPayload[],
};

/**
 * 获取视频流水线 SSE 事件序列。
 *
 * @param scenario - 流水线场景。
 * @param taskId - 可选的 taskId 覆盖。
 * @returns SSE 事件序列。
 */
export function getVideoPipelineEventSequence(
  scenario: VideoPipelineMockScenario = 'success',
  taskId?: string,
): TaskEventPayload[] {
  const events = SSE_FLOW_MAP[scenario] ?? SSE_FLOW_MAP.success;

  if (!taskId) {
    return events;
  }

  return events.map((event) => ({
    ...event,
    taskId,
    requestId: `req_${taskId}`,
  }));
}

/* ---------- 视频结果 ---------- */

const videoResultSuccess: VideoResult = videoResultSuccessJson as unknown as VideoResult;
const videoResultFailure: VideoFailure = videoResultFailureJson as unknown as VideoFailure;

/**
 * 获取视频任务成功结果 mock 数据。
 *
 * @param taskId - 可选的 taskId 覆盖。
 * @returns 成功结果。
 */
export function getMockVideoResult(taskId?: string): VideoResult {
  if (!taskId) {
    return videoResultSuccess;
  }

  return {
    ...videoResultSuccess,
    taskId,
    resultId: `video_result_${taskId}`,
  };
}

/**
 * 获取视频任务失败结果 mock 数据。
 *
 * @param taskId - 可选的 taskId 覆盖。
 * @returns 失败结果。
 */
export function getMockVideoFailure(taskId?: string): VideoFailure {
  if (!taskId) {
    return videoResultFailure;
  }

  return {
    ...videoResultFailure,
    taskId,
  };
}

/**
 * 从 SSE 事件序列的最后一个 completed 事件中提取嵌入的结果。
 *
 * @param scenario - 流水线场景。
 * @param taskId - 可选的 taskId 覆盖。
 * @returns 结果对象；失败场景返回 null。
 */
export function getVideoResultFromFlow(
  scenario: VideoPipelineMockScenario,
  taskId?: string,
): VideoResult | null {
  const events = getVideoPipelineEventSequence(scenario, taskId);
  const completed = events.find((e) => e.event === 'completed');

  if (completed?.result) {
    const result = completed.result as unknown as VideoResult;

    return taskId ? { ...result, taskId } : result;
  }

  return null;
}

/** 导出便于外部引用的 fixture 对象。 */
export const videoPipelineMockFixtures = {
  flows: SSE_FLOW_MAP,
  result: {
    success: videoResultSuccess,
    failure: videoResultFailure,
  },
} as const;
