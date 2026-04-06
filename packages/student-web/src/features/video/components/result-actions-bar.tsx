/**
 * 文件说明：视频结果操作区壳层（Story 4.8）。
 * 包含公开发布/取消公开、"使用此题目重新生成"和"复制链接"按钮。
 * 公开发布逻辑由 Story 4.10 补齐，本 Story 预留 adapter 占位。
 */
import { Copy, Globe, Repeat, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';

export interface ResultActionsBarProps {
  /** 任务 ID。 */
  taskId: string;
  /** 是否已公开发布。 */
  published?: boolean;
  /** 公开操作是否进行中。 */
  publishLoading?: boolean;
  /** 点击公开发布。 */
  onPublish?: () => void;
  /** 点击取消公开。 */
  onUnpublish?: () => void;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染结果操作区。
 *
 * @param props - 操作区属性。
 * @returns 操作区 UI。
 */
export function ResultActionsBar({
  taskId,
  published = false,
  publishLoading = false,
  onPublish,
  onUnpublish,
  className,
}: ResultActionsBarProps) {
  const navigate = useNavigate();
  const { notify } = useFeedback();

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify({ tone: 'success', title: '已复制链接' });
    } catch {
      notify({ tone: 'error', title: '复制失败，请手动复制地址栏链接' });
    }
  }, [notify]);

  const handleRegenerate = useCallback(() => {
    void navigate(`/video/input?reuseTaskId=${taskId}`);
  }, [navigate, taskId]);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* 公开发布 / 取消公开 */}
      {published ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onUnpublish}
          disabled={publishLoading}
          className="gap-1.5"
        >
          {publishLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          取消公开
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={onPublish}
          disabled={publishLoading}
          className="gap-1.5"
        >
          {publishLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          公开发布
        </Button>
      )}

      {/* 重新生成 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRegenerate}
        className="gap-1.5"
      >
        <Repeat className="w-3.5 h-3.5" />
        使用此题目重新生成
      </Button>

      {/* 复制链接 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void handleCopyLink()}
        className="gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" />
        复制链接
      </Button>
    </div>
  );
}
