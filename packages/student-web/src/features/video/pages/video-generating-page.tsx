/**
 * 文件说明：视频任务等待页（Story 3.5）。
 * 承接视频创建成功后的跳转，通过 SSE 消费任务进度事件并展示六阶段进度。
 * 支持页面刷新后通过 status API 恢复任务上下文。
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  TaskGeneratingView,
} from '@/components/generating/task-generating-view';
import { VideoFailurePanel } from '../components/video-failure-panel';
import { estimateEtaText, resolveVideoStage } from '../config/video-stages';
import { useVideoTaskSse } from '../hooks/use-video-task-sse';
import { useVideoTaskStatus } from '../hooks/use-video-task-status';

/** 等待页底部轮播提示池。 */
const TIPS = [
  '小麦提示：生成完毕后，您还可以通过自然语言二次修改画面。',
  '复杂的数学公式推导，小麦会自动为您添加高亮引导。',
  '视频渲染过程需要在云端进行大量计算，感谢您的耐心等待。',
  '您可以随时切换板书风格、讲师音色和教学节奏。',
  '生成历史会自动保存在您的工作台，随时可以回来查看。',
];

/** 完成后跳转结果页的延迟（毫秒）。 */
const COMPLETED_REDIRECT_DELAY_MS = 1500;

/**
 * 渲染视频生成等待页。
 *
 * 页面生命周期：
 * 1. mount 时根据 URL `:id` 查询任务快照（status API），恢复当前进度。
 * 2. 若任务仍在执行，建立 SSE 连接持续消费进度事件。
 * 3. 若任务已完成，自动跳转到结果页。
 * 4. 若任务失败/取消，展示终态 UI 与重试入口。
 * 5. 若 taskId 无效（404），展示提示并引导返回输入页。
 *
 * @returns 视频等待页。
 */
export function VideoGeneratingPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /* ── 1. 查询任务快照，恢复上下文 ── */
  const {
    snapshot,
    isLoading: isSnapshotLoading,
    isNotFound,
  } = useVideoTaskStatus(taskId);

  /* ── 2. SSE 事件流驱动进度 ── */
  // 仅在任务未处于终态时启用 SSE
  const sseEnabled =
    !isSnapshotLoading &&
    !isNotFound &&
    (snapshot === null ||
      (snapshot.status !== 'completed' &&
        snapshot.status !== 'failed' &&
        snapshot.status !== 'cancelled'));

  const sseState = useVideoTaskSse(taskId, { enabled: sseEnabled });

  /* ── 3. 合并状态：SSE 有实际事件时优先，否则用 snapshot 兜底 ── */
  const snapshotFallback = useMemo(() => {
    if (!snapshot) return null;
    const stage = resolveVideoStage(snapshot.progress);
    return {
      status: snapshot.status,
      progress: snapshot.progress,
      stageTitle: stage.label,
      etaText: estimateEtaText(snapshot.progress),
      errorCode: snapshot.errorCode ?? null,
      errorMessage: snapshot.message ?? null,
    };
  }, [snapshot]);

  // SSE 推送过实际进度事件时才采用 SSE 状态；仅 connected 不算（此时还没有进度数据，会覆盖 snapshot）
  const hasSseData = sseState.progress > 0 || sseState.status === 'completed' || sseState.status === 'failed' || sseState.status === 'cancelled';
  const effectiveStatus = hasSseData ? sseState.status : (snapshotFallback?.status ?? sseState.status);
  const effectiveProgress = hasSseData ? sseState.progress : (snapshotFallback?.progress ?? sseState.progress);
  const effectiveStageTitle = hasSseData ? sseState.stageTitle : (snapshotFallback?.stageTitle ?? sseState.stageTitle);
  const effectiveEtaText = hasSseData ? sseState.etaText : (snapshotFallback?.etaText ?? sseState.etaText);
  const effectiveLogs = sseState.logs;
  const effectiveErrorCode = hasSseData ? sseState.errorCode : (snapshotFallback?.errorCode ?? sseState.errorCode);
  const effectiveErrorMessage = hasSseData ? sseState.errorMessage : (snapshotFallback?.errorMessage ?? sseState.errorMessage);

  /* ── 4. 终态处理 ── */

  // 已完成 → 延迟跳转结果页（SSE 推送 completed 或 snapshot 恢复为 completed）
  useEffect(() => {
    if (effectiveStatus !== 'completed' || !taskId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void navigate(`/video/${taskId}`, { replace: true });
    }, COMPLETED_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [effectiveStatus, taskId, navigate]);

  /* ── 5. 操作回调 ── */
  const handleRetry = useCallback(() => {
    void navigate('/video/input?retry=1', { replace: true });
  }, [navigate]);

  const handleFeedback = useCallback(() => {
    // TODO: 对接反馈弹窗或反馈页面
  }, []);

  const handleReturn = useCallback(() => {
    void navigate('/video/input');
  }, [navigate]);

  /* ── 6. 渲染 ── */

  // 加载中
  if (isSnapshotLoading) {
    return (
      <TaskGeneratingView
        title="加载任务状态..."
        etaText="正在查询任务进度"
        progress={0}
        logs={[]}
        tips={TIPS}
        onReturn={handleReturn}
      />
    );
  }

  // 无效 taskId（404）
  if (isNotFound) {
    return (
      <TaskGeneratingView
        title="任务不存在"
        etaText="未找到该视频任务"
        progress={0}
        logs={[
          {
            id: 'not-found',
            status: 'error',
            text: `任务 ${taskId ?? ''} 不存在或已过期，请返回重新创建`,
          },
        ]}
        tips={[]}
        returnLabel="返回输入页"
        onReturn={handleReturn}
      />
    );
  }

  // 失败/取消态 → 展示错误面板与操作入口
  if (effectiveStatus === 'failed' || effectiveStatus === 'cancelled') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <VideoFailurePanel
          errorCode={effectiveErrorCode}
          errorMessage={effectiveErrorMessage}
          onRetry={handleRetry}
          onFeedback={handleFeedback}
        />
      </div>
    );
  }

  // 正常进度状态（pending / processing / completed 过渡）
  return (
    <TaskGeneratingView
      title={effectiveStageTitle}
      etaText={effectiveEtaText}
      progress={effectiveProgress}
      logs={effectiveLogs}
      tips={TIPS}
      onReturn={handleReturn}
    />
  );
}
