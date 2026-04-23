/**
 * 文件说明：共享 zod schema 统一导出。
 *
 * 用于 mock fixture 与 adapter 层的运行时形状校验，
 * 避免 `as unknown as T` 这类静默 cast 把字段错位埋到运行时。
 */
export {
  taskRuntimeStateSchema,
  taskEventPayloadSchema,
  taskEventPayloadArraySchema,
} from './task-event';

export {
  videoResultSectionSchema,
  videoResultSchema,
  videoFailureSchema,
} from './video-result';
