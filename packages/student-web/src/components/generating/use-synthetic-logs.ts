/**
 * 文件说明：将阶段标签 + 进度合成为滚动日志流，给不接 SSE 的等待场景使用。
 * 阶段标签变化时把前一条标记为 success，并 push 一条新的 pending 条。
 */
import { useEffect, useRef, useState } from 'react';

import type { TaskGeneratingLogItem } from './task-generating-shell';

export interface UseSyntheticLogsOptions {
  /** 完成态触发完成日志；可选，默认不注入。 */
  completedLabel?: string;
  /** 失败态触发失败日志；可选。 */
  failedLabel?: string;
  /** 当前任务是否已完成（决定把最后一条标记 success 还是 error）。 */
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  /** 最多保留的日志条数，默认 12。 */
  maxLogs?: number;
}

/**
 * 当 `stageLabel` 发生变化时追加一条日志，并把之前的 pending 条转 success。
 */
export function useSyntheticLogs(
  stageLabel: string | null | undefined,
  progress: number,
  options: UseSyntheticLogsOptions = {},
): TaskGeneratingLogItem[] {
  const { completedLabel, failedLabel, status = 'processing', maxLogs = 12 } = options;
  const [logs, setLogs] = useState<TaskGeneratingLogItem[]>([]);
  const lastStageRef = useRef<string | null>(null);
  const counterRef = useRef(0);
  const terminalHandledRef = useRef(false);

  useEffect(() => {
    if (!stageLabel) return;
    if (lastStageRef.current === stageLabel) return;
    lastStageRef.current = stageLabel;
    counterRef.current += 1;
    const id = `stage-${counterRef.current}`;
    setLogs((prev) => {
      const next = prev.map((item) =>
        item.status === 'pending' ? { ...item, status: 'success' as const } : item,
      );
      next.push({ id, status: 'pending', text: stageLabel });
      return next.slice(-maxLogs);
    });
  }, [stageLabel, maxLogs]);

  useEffect(() => {
    if (status !== 'completed' && status !== 'failed') {
      terminalHandledRef.current = false;
      return;
    }
    if (terminalHandledRef.current) return;
    terminalHandledRef.current = true;

    setLogs((prev) => {
      const next = prev.map((item) =>
        item.status === 'pending'
          ? { ...item, status: status === 'completed' ? ('success' as const) : ('error' as const) }
          : item,
      );
      const terminalLabel = status === 'completed' ? completedLabel : failedLabel;
      if (terminalLabel) {
        counterRef.current += 1;
        next.push({
          id: `stage-${counterRef.current}`,
          status: status === 'completed' ? 'success' : 'error',
          text: terminalLabel,
        });
      }
      return next.slice(-maxLogs);
    });
  }, [status, completedLabel, failedLabel, maxLogs]);

  // progress 仅参与 tag；保留引用避免 lint 未用
  void progress;

  return logs;
}
