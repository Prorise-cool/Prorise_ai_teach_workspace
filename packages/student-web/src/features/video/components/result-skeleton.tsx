/**
 * 文件说明：视频结果页加载骨架屏组件。
 * 在结果数据加载期间渲染占位动画。
 */

/**
 * 渲染结果页 loading skeleton。
 *
 * @returns Skeleton UI。
 */
export function ResultSkeleton() {
  return (
    <div className="video-result-page__layout animate-pulse">
      <div className="video-result-page__player-area">
        <div className="aspect-video bg-muted rounded-xl" />
      </div>
      <div className="video-result-page__sidebar space-y-4">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-16 w-full bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}
