/**
 * 文件说明：统一任务错误码到用户可读文案的映射。
 * 所有等待页与结果页的错误展示统一从这里取文案，不在组件内硬编码。
 */
import type { TaskErrorCode } from '@/types/task';

/** 任务错误码 → 用户可读文案映射。 */
const TASK_ERROR_MESSAGES: Record<TaskErrorCode, string> = {
  TASK_INVALID_INPUT: '输入内容不符合要求，请检查后重新提交',
  TASK_PROVIDER_UNAVAILABLE: '当前 AI 服务暂时不可用，请稍后重试',
  TASK_PROVIDER_TIMEOUT: 'AI 服务响应超时，请稍后重试',
  TASK_PROVIDER_ALL_FAILED: '所有 AI 服务均不可用，请稍后再试',
  TASK_CANCELLED: '任务已被取消',
  TASK_UNHANDLED_EXCEPTION: '系统遇到意外错误，请稍后重试或联系客服',
};

/**
 * 根据任务错误码返回用户可读文案。
 *
 * @param errorCode - 任务错误码。
 * @returns 用户可读的错误描述。
 */
export function getTaskErrorMessage(errorCode: TaskErrorCode | null | undefined): string {
  if (!errorCode) {
    return '任务处理异常，请稍后重试';
  }

  return TASK_ERROR_MESSAGES[errorCode] ?? '任务处理异常，请稍后重试';
}
