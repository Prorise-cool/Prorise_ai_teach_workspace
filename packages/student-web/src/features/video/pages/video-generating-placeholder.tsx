/**
 * 文件说明：视频等待页占位组件，供 Story 3.2 创建后的跳转闭环使用。
 */
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * 渲染视频等待页占位。
 *
 * @returns 等待页占位节点。
 */
export function VideoGeneratingPlaceholder() {
  const { id } = useParams<{ id: string }>();

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4',
        'bg-background text-foreground',
      )}
    >
      <Loader2 className={cn('h-8 w-8 animate-spin text-primary')} />
      <h1 className={cn('text-lg font-semibold')}>视频生成中...</h1>
      <p className={cn('text-sm text-muted-foreground')}>
        任务 ID：{id ?? '未知'}
      </p>
    </div>
  );
}
