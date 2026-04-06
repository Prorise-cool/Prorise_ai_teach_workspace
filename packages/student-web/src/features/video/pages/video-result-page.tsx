/**
 * 文件说明：视频结果页（Story 4.8）。
 * 展示 Video.js 播放器、结果摘要、操作区与后续动作入口。
 * 支持 loading skeleton、完成态、视频缺失态、权限失败态和加载失败态。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2, RefreshCw, ShieldAlert, VideoOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FutureActionsBar } from '../components/future-actions-bar';
import { ResultActionsBar } from '../components/result-actions-bar';
import { ResultSummaryCard } from '../components/result-summary-card';
import { VideoPlayer } from '../components/video-player';
import { useVideoResult } from '../hooks/use-video-result';

import '../styles/_result.scss';

/**
 * 渲染 loading skeleton。
 *
 * @returns Skeleton UI。
 */
function ResultSkeleton() {
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

/**
 * 渲染错误状态页面。
 *
 * @param props - 错误属性。
 * @returns 错误 UI。
 */
function ResultErrorView({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: typeof AlertCircle;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-20">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * 渲染视频结果页。
 *
 * @returns 结果页 UI。
 */
export function VideoResultPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, viewStatus, refetch } = useVideoResult(taskId);

  const handleReturn = () => void navigate('/video/input');

  /* ── Header ── */
  const header = (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50">
      <button
        onClick={handleReturn}
        className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-border/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        返回
      </button>

      {data?.result && (
        <h1 className="text-sm font-semibold text-foreground truncate max-w-[50%]">
          {data.result.title}
        </h1>
      )}

      <div className="w-8" />
    </header>
  );

  /* ── Loading ── */
  if (viewStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultSkeleton />
      </div>
    );
  }

  /* ── Permission denied (403) ── */
  if (viewStatus === 'permission-denied') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={ShieldAlert}
          title="无权访问"
          message="该视频任务不属于当前账号"
          action={
            <Button variant="default" onClick={handleReturn}>
              返回创建新视频
            </Button>
          }
        />
      </div>
    );
  }

  /* ── Video missing (URL 失效) ── */
  if (viewStatus === 'video-missing') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={VideoOff}
          title="视频不可用"
          message="视频文件已过期或不可访问，请尝试重新生成"
          action={
            <Button variant="default" onClick={handleReturn}>
              返回创建新视频
            </Button>
          }
        />
      </div>
    );
  }

  /* ── API error ── */
  if (viewStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={AlertCircle}
          title="加载失败"
          message="无法获取视频结果，请检查网络后重试"
          action={
            <Button variant="default" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          }
        />
      </div>
    );
  }

  /* ── Success ── */
  const result = data!.result!;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {header}

      <div className="video-result-page__layout">
        {/* 左侧：播放器 */}
        <div className="video-result-page__player-area">
          <VideoPlayer
            videoUrl={result.videoUrl}
            posterUrl={result.coverUrl}
          />
        </div>

        {/* 右侧/下方：信息区 */}
        <div className="video-result-page__sidebar">
          {/* 摘要 */}
          <ResultSummaryCard
            title={result.title}
            summary={result.summary}
            knowledgePoints={result.knowledgePoints}
            duration={result.duration}
            aiContentFlag={result.aiContentFlag}
          />

          {/* 分隔线 */}
          <div className="border-t border-border/50" />

          {/* 结果操作区 */}
          <ResultActionsBar
            taskId={taskId!}
            published={result.published}
          />

          {/* 分隔线 */}
          <div className="border-t border-border/50" />

          {/* 后续动作入口 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              继续学习
            </h3>
            <FutureActionsBar />
          </div>
        </div>
      </div>
    </div>
  );
}
