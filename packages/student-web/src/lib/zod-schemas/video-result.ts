/**
 * 文件说明：视频任务 VideoResult / VideoFailure 的 zod schema。
 *
 * 与 src/types/video.ts 的 `VideoResult` / `VideoFailure` / `VideoResultSection`
 * 接口一一对应，用于 mock fixture 加载时对外部 JSON 做运行时校验。
 */
import { z } from 'zod';

import {
  VIDEO_LAYOUT_HINT_VALUES,
  VIDEO_PIPELINE_STAGE_VALUES,
  type VideoFailure,
  type VideoResult,
  type VideoResultSection,
} from '@/types/video';

const layoutHintSchema = z.enum(VIDEO_LAYOUT_HINT_VALUES);
const pipelineStageSchema = z.enum(VIDEO_PIPELINE_STAGE_VALUES);

/** 视频结果 section schema，对应 `VideoResultSection`。 */
export const videoResultSectionSchema: z.ZodType<VideoResultSection> = z.object({
  sectionId: z.string(),
  sectionIndex: z.number(),
  title: z.string().optional(),
  summary: z.string().optional(),
  subtitleText: z.string().nullable().optional(),
  ttsText: z.string().nullable().optional(),
  narrationText: z.string().nullable().optional(),
  lectureLines: z.array(z.string()).optional(),
  startSeconds: z.number().nullable().optional(),
  endSeconds: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
});

/** 视频任务成功结果 schema，对应 `VideoResult`。 */
export const videoResultSchema: z.ZodType<VideoResult> = z.object({
  taskId: z.string(),
  taskType: z.literal('video'),
  videoUrl: z.string(),
  coverUrl: z.string(),
  duration: z.number(),
  summary: z.string(),
  knowledgePoints: z.array(z.string()),
  resultId: z.string(),
  completedAt: z.string(),
  aiContentFlag: z.boolean(),
  title: z.string(),
  providerUsed: z.record(z.string(), z.array(z.string())).optional(),
  published: z.boolean().optional(),
  publicUrl: z.string().nullable().optional(),
  sections: z.array(videoResultSectionSchema).optional(),
  layoutHint: layoutHintSchema.optional(),
});

/** 视频任务失败结果 schema，对应 `VideoFailure`。 */
export const videoFailureSchema: z.ZodType<VideoFailure> = z.object({
  taskId: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  failedStage: pipelineStageSchema,
  failedAt: z.string(),
  retryable: z.boolean(),
});
