/**
 * 文件说明：视频结果页（Story 4.8）。
 * 展示 Video.js 播放器、结果摘要、操作区与后续动作入口。
 * 支持 loading skeleton、完成态、视频缺失态、权限失败态和加载失败态。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCw, ShieldAlert, VideoOff } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';

import { FutureActionsBar } from '../components/future-actions-bar';
import { ResultActionsBar } from '../components/result-actions-bar';
import { ResultErrorView } from '../components/result-error-view';
import { ResultSkeleton } from '../components/result-skeleton';
import { ResultSummaryCard } from '../components/result-summary-card';
import { VideoPlayer } from '../components/video-player';
import { useVideoPublish } from '../hooks/use-video-publish';
import { useVideoResult } from '../hooks/use-video-result';

import '../styles/_result.scss';

/**
 * 渲染视频结果页。
 *
 * @returns 结果页 UI。
 */
export function VideoResultPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const { data, viewStatus, refetch } = useVideoResult(taskId);
  const { publish, unpublish, isLoading: publishLoading } = useVideoPublish(taskId ?? '');

  const handleReturn = () => void navigate('/video/input');

  /* -- Header -- */
  const header = (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/50">
      <button
        onClick={handleReturn}
        className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-border/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        {t('video.common.returnLabel')}
      </button>

      {data?.result && (
        <h1 className="text-sm font-semibold text-foreground truncate max-w-[50%]">
          {data.result.title}
        </h1>
      )}

      <div className="w-8" />
    </header>
  );

  /* -- Loading -- */
  if (viewStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultSkeleton />
      </div>
    );
  }

  /* -- Permission denied (403) -- */
  if (viewStatus === 'permission-denied') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={ShieldAlert}
          title={t('video.result.permissionDeniedTitle')}
          message={t('video.result.permissionDeniedMessage')}
          action={
            <Button variant="default" onClick={handleReturn}>
              {t('video.common.createNew')}
            </Button>
          }
        />
      </div>
    );
  }

  /* -- Video missing (URL 失效) -- */
  if (viewStatus === 'video-missing') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={VideoOff}
          title={t('video.result.videoMissingTitle')}
          message={t('video.result.videoMissingMessage')}
          action={
            <Button variant="default" onClick={handleReturn}>
              {t('video.common.createNew')}
            </Button>
          }
        />
      </div>
    );
  }

  /* -- API error -- */
  if (viewStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <ResultErrorView
          icon={AlertCircle}
          title={t('video.result.loadErrorTitle')}
          message={t('video.result.loadErrorMessage')}
          action={
            <Button variant="default" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              {t('video.common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  /* -- Success -- */
  if (!data?.result) {
    return null;
  }

  const result = data.result;

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
            publishLoading={publishLoading}
            onPublish={publish}
            onUnpublish={unpublish}
          />

          {/* 分隔线 */}
          <div className="border-t border-border/50" />

          {/* 后续动作入口 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('video.common.continueLearning')}
            </h3>
            <FutureActionsBar />
          </div>
        </div>
      </div>
    </div>
  );
}
