/**
 * 文件说明：任务流 SSE 事件载荷的 zod schema。
 *
 * 与 src/types/task.ts 中的 `TaskEventPayload` 接口一一对应，用于在 mock
 * fixture 加载时对外部 JSON 做运行时校验，避免静默吃掉字段错位。
 *
 * 仅校验数据形状，不做业务约束（这些约束属于业务层职责）。
 */
import { z } from 'zod';

import { TASK_EVENT_NAME_VALUES, TASK_STATUS_VALUES } from '@/types/task';

const taskLifecycleStatusSchema = z.enum(TASK_STATUS_VALUES);
// errorCode 在 SSE 上由后端塞入，可能是任务层（TASK_*）或视频流水线层
// （VIDEO_*）等任意 domain 错误码，schema 仅校验为字符串，避免 cast 静默吞掉
// fixture 与 production 数据。具体语义判断留给消费层。
const taskErrorCodeSchema = z.string();
const taskEventNameSchema = z.enum(TASK_EVENT_NAME_VALUES);

/** 任务运行时状态 schema，对应 `TaskRuntimeState`。 */
export const taskRuntimeStateSchema = z.object({
  taskId: z.string(),
  requestId: z.string().nullable(),
  taskType: z.string(),
  status: taskLifecycleStatusSchema,
  progress: z.number(),
  message: z.string(),
  timestamp: z.string(),
  stage: z.string().nullable().optional(),
  currentStage: z.string().nullable().optional(),
  stageLabel: z.string().nullable().optional(),
  stageProgress: z.number().nullable().optional(),
  errorCode: taskErrorCodeSchema.nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 任务 SSE 事件载荷 schema，对应 `TaskEventPayload`。
 *
 * 注意：`errorCode` 故意宽于 TS 端 `TaskErrorCode` enum，因为后端会在同一
 * 字段塞入跨 domain 错误码（任务层 + 视频流水线层）。需要消费 enum 类型
 * 时，在调用点显式 narrow。
 */
export const taskEventPayloadSchema = taskRuntimeStateSchema.extend({
  id: z.string().optional(),
  sequence: z.number().optional(),
  event: taskEventNameSchema,
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  resumeFrom: z.string().nullable().optional(),
});

/** 任务 SSE 事件序列 schema。 */
export const taskEventPayloadArraySchema = z.array(taskEventPayloadSchema);
