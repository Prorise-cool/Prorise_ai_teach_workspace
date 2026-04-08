/**
 * 文件说明：统一任务错误码到用户可读文案的映射。
 * 所有等待页与结果页的错误展示统一从这里取文案，不在组件内硬编码。
 */
/** 任务错误码 → 用户可读文案映射。 */
const TASK_ERROR_MESSAGES: Record<string, string> = {
  /* ── 统一任务框架 ── */
  TASK_INVALID_INPUT: '输入内容不符合要求，请检查后重新提交',
  TASK_PROVIDER_UNAVAILABLE: '当前 AI 服务暂时不可用，请稍后重试',
  TASK_PROVIDER_TIMEOUT: 'AI 服务响应超时，请稍后重试',
  TASK_PROVIDER_ALL_FAILED: '所有 AI 服务均不可用，请稍后再试',
  TASK_CANCELLED: '任务已被取消',
  TASK_UNHANDLED_EXCEPTION: '系统遇到意外错误，请稍后重试或联系客服',
  /* ── 视频流水线阶段 ── */
  VIDEO_UNDERSTANDING_FAILED: '题目理解失败，请检查输入内容后重试',
  VIDEO_STORYBOARD_FAILED: '分镜生成失败，请稍后重试',
  VIDEO_MANIM_GEN_FAILED: '动画脚本生成失败，请稍后重试',
  VIDEO_RENDER_FAILED: '动画渲染失败，请稍后重试',
  VIDEO_RENDER_TIMEOUT: '动画渲染超时，请稍后重试',
  VIDEO_RENDER_OOM: '渲染资源不足，请稍后重试',
  VIDEO_RENDER_DISK_FULL: '渲染存储空间不足，请稍后重试',
  VIDEO_TTS_ALL_PROVIDERS_FAILED: '语音合成服务不可用，请稍后重试',
  VIDEO_COMPOSE_FAILED: '视频合成失败，请稍后重试',
  VIDEO_UPLOAD_FAILED: '视频上传失败，请稍后重试',
  /* ── 沙箱安全 ── */
  SANDBOX_NETWORK_VIOLATION: '渲染过程违反网络安全策略',
  SANDBOX_FS_VIOLATION: '渲染过程违反文件系统安全策略',
  SANDBOX_PROCESS_VIOLATION: '渲染过程违反进程安全策略',
};

/**
 * 根据任务错误码返回用户可读文案。
 * 当 errorCode 为空或无匹配映射时返回 undefined，由调用方决定 fallback（如后端原始 errorMessage）。
 *
 * @param errorCode - 任务错误码。
 * @returns 用户可读的错误描述，无匹配时返回 undefined。
 */
export function getTaskErrorMessage(
  errorCode: string | null | undefined,
): string | undefined {
  if (!errorCode) {
    return undefined;
  }

  return TASK_ERROR_MESSAGES[errorCode];
}
