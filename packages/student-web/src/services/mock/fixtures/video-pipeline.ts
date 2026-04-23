/**
 * 文件说明：提供视频流水线 SSE stage 流、状态查询与结果查询的 mock fixture。
 * Story 4.1：消费 mocks/video/v1/ 下的 pipeline-stages 和 video-result 样例数据。
 *
 * Wave 0.2：将 JSON 加载从 `as unknown as T` cast 切换到 zod 解析，
 * 字段错位会在 fixture 加载阶段就抛出，不再隐藏到运行时。
 */
import type { TaskEventPayload } from '@/types/task';
import {
  taskEventPayloadArraySchema,
  videoFailureSchema,
  videoResultSchema,
} from '@/lib/zod-schemas';
import type {
  VideoFailure,
  VideoPreviewSection,
  VideoPipelineMockScenario,
  VideoResult,
  VideoTaskPreview,
} from '@/types/video';

import successFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.success-flow.json';
import fixFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.fix-flow.json';
import failureFlowJson from '../../../../../../mocks/video/v1/pipeline-stages.failure-flow.json';
import videoResultSuccessJson from '../../../../../../mocks/video/v1/video-result.success.json';
import videoResultFailureJson from '../../../../../../mocks/video/v1/video-result.failure.json';

/* ---------- SSE 事件序列 ---------- */

// 注意：zod schema 的 `errorCode` 是 string；TS 类型 `TaskErrorCode` 是 enum。
// 这里在 schema 校验通过的前提下做一次受控的 enum narrow，把跨 domain 错误码
// （如 VIDEO_RENDER_TIMEOUT）按 fixture 现状归入 TaskEventPayload。
const SSE_FLOW_MAP: Record<VideoPipelineMockScenario, TaskEventPayload[]> = {
  success: taskEventPayloadArraySchema.parse(successFlowJson) as TaskEventPayload[],
  fix: taskEventPayloadArraySchema.parse(fixFlowJson) as TaskEventPayload[],
  failure: taskEventPayloadArraySchema.parse(failureFlowJson) as TaskEventPayload[],
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

const videoResultSuccess: VideoResult = videoResultSchema.parse(videoResultSuccessJson);
const videoResultFailure: VideoFailure = videoFailureSchema.parse(videoResultFailureJson);

const PREVIEW_TIMESTAMP = '2026-04-16T10:00:00Z';

function createPreviewSection(
  overrides: Partial<VideoPreviewSection>,
): VideoPreviewSection {
  return {
    sectionId: 'section_1',
    sectionIndex: 0,
    title: '导数的生活入口',
    lectureLines: ['从速度表切入，建立“瞬时变化率”的直觉。'],
    visualNotes: ['镜头从汽车仪表盘推入，速度指针在高亮区域轻微跳动。'],
    status: 'pending',
    audioUrl: null,
    clipUrl: null,
    errorMessage: null,
    fixAttempt: null,
    updatedAt: PREVIEW_TIMESTAMP,
    ...overrides,
  };
}

function buildPreview(
  taskId: string,
  status: VideoTaskPreview['status'],
  sections: VideoPreviewSection[],
  previewVersion: number,
): VideoTaskPreview {
  const readySections = sections.filter((section) => section.status === 'ready').length;
  const failedSections = sections.filter((section) => section.status === 'failed').length;

  return {
    taskId,
    status,
    previewAvailable: true,
    previewVersion,
    summary: '先建立“瞬时速度”的生活直觉，再把平均变化率收敛到切线斜率，最后落到导数定义。',
    knowledgePoints: ['平均变化率', '切线斜率', '极限', '导数定义'],
    totalSections: sections.length,
    readySections,
    failedSections,
    sections,
    updatedAt: PREVIEW_TIMESTAMP,
  };
}

const previewFixtures: Record<VideoPipelineMockScenario, VideoTaskPreview> = {
  success: buildPreview(
    'vtask_mock_preview_success',
    'processing',
    [
      createPreviewSection({
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '生活中的瞬时速度',
        status: 'ready',
        audioUrl: 'https://static.prorise.test/preview/section_1.mp3',
        clipUrl: 'https://static.prorise.test/preview/section_1.mp4',
      }),
      createPreviewSection({
        sectionId: 'section_2',
        sectionIndex: 1,
        title: '平均变化率到割线斜率',
        lectureLines: ['把运动映射到函数图像，引出割线斜率。'],
        visualNotes: ['绘制函数曲线，并用两点连线显示割线斜率。'],
        status: 'ready',
        audioUrl: 'https://static.prorise.test/preview/section_2.mp3',
        clipUrl: 'https://static.prorise.test/preview/section_2.mp4',
      }),
      createPreviewSection({
        sectionId: 'section_3',
        sectionIndex: 2,
        title: '极限逼近切线',
        lectureLines: ['让第二个点不断靠近，观察割线如何变成切线。'],
        visualNotes: ['第二个点沿曲线缓慢移动，割线逐步贴合为切线。'],
        status: 'rendering',
        audioUrl: 'https://static.prorise.test/preview/section_3.mp3',
      }),
      createPreviewSection({
        sectionId: 'section_4',
        sectionIndex: 3,
        title: '导数定义收口',
        lectureLines: ['把几何直觉压缩成导数的代数定义。'],
        visualNotes: ['画面收束为导数极限公式，并突出最终结论。'],
        status: 'pending',
      }),
    ],
    4,
  ),
  fix: buildPreview(
    'vtask_mock_preview_fix',
    'processing',
    [
      createPreviewSection({
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '问题引入',
        status: 'ready',
        audioUrl: 'https://static.prorise.test/preview/fix_section_1.mp3',
        clipUrl: 'https://static.prorise.test/preview/fix_section_1.mp4',
      }),
      createPreviewSection({
        sectionId: 'section_2',
        sectionIndex: 1,
        title: '切线逼近',
        lectureLines: ['自动修正几何元素的位置与字幕布局。'],
        visualNotes: ['几何元素重新排版，字幕安全区重新对齐。'],
        status: 'fixing',
        audioUrl: 'https://static.prorise.test/preview/fix_section_2.mp3',
        fixAttempt: 1,
      }),
      createPreviewSection({
        sectionId: 'section_3',
        sectionIndex: 2,
        title: '公式收口',
        lectureLines: ['等待修复完成后继续推进。'],
        visualNotes: ['等待修复完成后，再把镜头切向导数公式。'],
        status: 'pending',
      }),
    ],
    3,
  ),
  failure: buildPreview(
    'vtask_mock_preview_failure',
    'failed',
    [
      createPreviewSection({
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '问题引入',
        status: 'ready',
        audioUrl: 'https://static.prorise.test/preview/failure_section_1.mp3',
        clipUrl: 'https://static.prorise.test/preview/failure_section_1.mp4',
      }),
      createPreviewSection({
        sectionId: 'section_2',
        sectionIndex: 1,
        title: '渲染失败段',
        lectureLines: ['本段渲染失败，用于验证 section 级失败不等于整页失败。'],
        visualNotes: ['该段画面说明保留，但渲染资产未成功输出。'],
        status: 'failed',
        errorMessage: '当前段渲染超时，请等待系统自动重试',
      }),
      createPreviewSection({
        sectionId: 'section_3',
        sectionIndex: 2,
        title: '后续段落',
        lectureLines: ['后续段落未执行。'],
        visualNotes: ['后续画面尚未开始生成。'],
        status: 'pending',
      }),
    ],
    5,
  ),
};

/**
 * 获取视频任务成功结果 mock 数据。
 *
 * @param taskId - 可选的 taskId 覆盖。
 * @returns 成功结果。
 */
export function getMockVideoResult(taskId?: string): VideoResult {
  const resolvedTaskId = taskId ?? videoResultSuccess.taskId;
  const resolvedResultId = taskId
    ? `video_result_${resolvedTaskId}`
    : videoResultSuccess.resultId;
  const preview = getMockVideoPreview(resolvedTaskId, 'success');
  const sectionDuration =
    videoResultSuccess.duration > 0 && preview.sections.length > 0
      ? videoResultSuccess.duration / preview.sections.length
      : 0;

  const normalizedSections = preview.sections.map((section) => ({
    sectionId: section.sectionId,
    sectionIndex: section.sectionIndex,
    title: section.title,
    summary: section.lectureLines[0] ?? '',
    narrationText: section.lectureLines.join(' '),
    lectureLines: section.lectureLines,
    startSeconds: section.sectionIndex * sectionDuration,
    endSeconds: (section.sectionIndex + 1) * sectionDuration,
    durationSeconds: sectionDuration,
  }));

  if (!taskId) {
    return {
      ...videoResultSuccess,
      publicUrl: `https://app.prorise.test/video/public/${resolvedResultId}`,
      sections: normalizedSections,
    };
  }

  return {
    ...videoResultSuccess,
    taskId: resolvedTaskId,
    resultId: resolvedResultId,
    publicUrl: `https://app.prorise.test/video/public/${resolvedResultId}`,
    sections: normalizedSections,
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
 * 获取视频等待页渐进预览 mock 数据。
 *
 * @param taskId - 可选的 taskId 覆盖。
 * @param scenario - 流水线场景。
 * @returns 视频等待页 preview。
 */
export function getMockVideoPreview(
  taskId?: string,
  scenario: VideoPipelineMockScenario = 'success',
): VideoTaskPreview {
  const preview = previewFixtures[scenario] ?? previewFixtures.success;

  if (!taskId) {
    return preview;
  }

  return {
    ...preview,
    taskId,
    sections: preview.sections.map((section) => ({
      ...section,
      audioUrl: section.audioUrl?.replace(preview.taskId, taskId) ?? section.audioUrl,
      clipUrl: section.clipUrl?.replace(preview.taskId, taskId) ?? section.clipUrl,
    })),
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
    const result = videoResultSchema.parse(completed.result);

    return taskId ? { ...result, taskId } : result;
  }

  return null;
}

/** 导出便于外部引用的 fixture 对象。 */
export const videoPipelineMockFixtures = {
  flows: SSE_FLOW_MAP,
  preview: previewFixtures,
  result: {
    success: videoResultSuccess,
    failure: videoResultFailure,
  },
} as const;
