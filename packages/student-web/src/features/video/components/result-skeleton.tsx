/**
 * 文件说明：视频结果页加载骨架屏组件（全屏画布模式）。
 * 在结果数据加载期间渲染全屏画布占位 + 底部 Dock 占位。
 */

/**
 * 渲染结果页 loading skeleton。
 *
 * @returns Skeleton UI。
 */
export function ResultSkeleton() {
  return (
    <div className="flex flex-col h-full w-full animate-pulse">
      {/* Header 占位 */}
      <div className="h-[72px] flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-muted rounded" />
          <div className="h-5 w-48 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-48 bg-muted rounded-full" />
          <div className="w-5 h-5 bg-muted rounded" />
          <div className="w-5 h-5 bg-muted rounded" />
        </div>
      </div>

      {/* 进度条占位 */}
      <div className="px-10 mb-2">
        <div className="h-1 w-full bg-muted rounded-full" />
      </div>

      {/* 画布占位 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[400px] h-[300px] bg-muted rounded-xl" />
      </div>

      {/* Dock 占位 */}
      <div className="flex justify-center pb-10">
        <div className="h-16 w-64 bg-muted rounded-full" />
      </div>
    </div>
  );
}
