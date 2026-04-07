/**
 * 文件说明：视频结果页（Apple Dock 无界画布版）。
 * 全屏无界画布 + macOS Dock 播放控制台 + Companion 智能侧栏。
 * 支持 loading skeleton、完成态、视频缺失态、权限失败态和加载失败态。
 */
import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShieldAlert, VideoOff } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';

import { CompanionSidebar } from '../components/companion-sidebar';
import { PublishBanner } from '../components/publish-banner';
import { ResultErrorView } from '../components/result-error-view';
import { ResultHeader } from '../components/result-header';
import { ResultSkeleton } from '../components/result-skeleton';
import { VideoDock } from '../components/video-dock';
import { VideoPlayer } from '../components/video-player';
import type { VideoPlayerHandle } from '../components/video-player';
import { VideoProgressBar } from '../components/video-progress-bar';
import { VideoSubtitle } from '../components/video-subtitle';
import { useSidebarToggle } from '../hooks/use-sidebar-toggle';
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
  const { t } = useAppTranslation();
  const { data, viewStatus, refetch } = useVideoResult(taskId);
  const { publish, unpublish, isLoading: publishLoading } = useVideoPublish(taskId ?? '');
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarToggle(true);
  const playerRef = useRef<VideoPlayerHandle>(null);

  const handleReturn = () => void window.history.back();

  /* -- Loading -- */
  if (viewStatus === 'loading') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
          <ResultSkeleton />
        </main>
      </div>
    );
  }

  /* -- Permission denied (403) -- */
  if (viewStatus === 'permission-denied') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
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
        </main>
      </div>
    );
  }

  /* -- Video missing -- */
  if (viewStatus === 'video-missing') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
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
        </main>
      </div>
    );
  }

  /* -- API error -- */
  if (viewStatus === 'error') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
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
        </main>
      </div>
    );
  }

  /* -- Success -- */
  if (!data?.result) {
    return null;
  }

  const result = data.result;

  return (
    <div className="xm-video-result">
      <main className="xm-video-result__canvas">
        {/* 背景装饰层 */}
        <div className="xm-video-result__ambient">
          <div className="xm-video-result__grid" />
          <div className="xm-video-result__glow" />
        </div>

        {/* Header */}
        <ResultHeader
          title={result.title}
          taskId={taskId}
          published={result.published}
          publishLoading={publishLoading}
          onPublish={publish}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* 进度条 */}
        <VideoProgressBar playerRef={playerRef} />

        {/* 发布横幅（仅已公开时显示） */}
        {result.published && (
          <PublishBanner
            unpublishLoading={publishLoading}
            onUnpublish={unpublish}
          />
        )}

        {/* 全屏播放器 */}
        <div className="xm-video-result__player-fullscreen">
          <VideoPlayer
            ref={playerRef}
            videoUrl={result.videoUrl}
            posterUrl={result.coverUrl}
            hideControls
          />
        </div>

        {/* 底部字幕 */}
        <VideoSubtitle text={result.summary} />

        {/* macOS Dock 播放控制台 */}
        <VideoDock playerRef={playerRef} />
      </main>

      {/* Companion 侧栏 */}
      <CompanionSidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
    </div>
  );
}
