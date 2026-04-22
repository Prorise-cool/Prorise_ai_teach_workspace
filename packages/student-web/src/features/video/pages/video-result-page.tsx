/**
 * 文件说明：视频结果页（播放器优先版）。
 * 保持 main 与 aside 同级 flex，侧栏只通过真实宽度挤压主舞台，不覆盖视频区域。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShieldAlert, Trash2, VideoOff, VolumeX } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';

import { CompanionSidebar } from '../components/companion-sidebar-v2';
import { useSidebarToggle } from '../hooks/use-sidebar-toggle';
import { PublishBanner } from '../components/publish-banner';
import { ResultErrorView } from '../components/result-error-view';
import { ResultHeader } from '../components/result-header';
import { ResultSkeleton } from '../components/result-skeleton';
import { VideoDock } from '../components/video-dock';
import { VideoPlayer } from '../components/video-player';
import type { VideoPlayerHandle } from '../components/video-player';
import { VideoProgressBar } from '../components/video-progress-bar';
import { useVideoPublish } from '../hooks/use-video-publish';
import { useVideoResult } from '../hooks/use-video-result';
import {
  buildPlaybackSections,
  getActivePlaybackSection,
} from '../utils/result-playback';

import '../styles/_result.scss';

/**
 * 渲染视频结果页。
 *
 * @returns 结果页 UI。
 */
export function VideoResultPage() {
  const { taskId: taskIdParam, resultId: resultIdParam } = useParams<{
    taskId?: string;
    resultId?: string;
  }>();
  const isPublicView = useMatch('/video/public/:resultId') !== null;
  const lookupId = isPublicView ? resultIdParam : taskIdParam;
  const { t } = useAppTranslation();
  const { data, viewStatus, refetch } = useVideoResult(lookupId, {
    publicView: isPublicView,
  });
  const { publish, unpublish, isLoading: publishLoading } = useVideoPublish(taskIdParam ?? '');
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarToggle(!isPublicView);
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [playbackState, setPlaybackState] = useState({
    currentTimeSeconds: 0,
    durationSeconds: 0,
  });
  const [bannerVisible, setBannerVisible] = useState(true);
  // 静音提示：autoplay 策略要求无声播放，视频实际自带音频。监听播放器静音
  // 状态，静音时显示一个右下角小 tip 提示用户点击解除，用户点击后自动隐藏。
  const [mutedTipVisible, setMutedTipVisible] = useState(false);

  const handleReturn = () => void window.history.back();

  const sections = data?.result?.sections;
  const duration = playbackState.durationSeconds || data?.result?.duration || 0;
  const playbackSections = sections ? buildPlaybackSections(sections, duration) : [];
  const activeSection = getActivePlaybackSection(playbackSections, playbackState.currentTimeSeconds);

  const currentAnchor = useMemo(() => ({
    taskId: lookupId ?? '',
    seconds: playbackState.currentTimeSeconds,
    sectionTitle: activeSection?.title,
  }), [lookupId, playbackState.currentTimeSeconds, activeSection?.title]);

  useEffect(() => {
    if (!data?.result) return;
    const pollMuted = () => {
      const player = playerRef.current?.getPlayer();
      if (player) setMutedTipVisible(player.muted() === true);
    };
    // 视频加载后每 400ms 检查静音状态；用户点击解除后状态变 false → 提示消失
    const timer = window.setInterval(pollMuted, 400);
    return () => window.clearInterval(timer);
  }, [data?.result]);

  useEffect(() => {
    if (!data?.result) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const player = playerRef.current?.getPlayer();
      const nextCurrentTime = player?.currentTime() ?? 0;
      const nextDuration = player?.duration() ?? data.result?.duration ?? 0;

      setPlaybackState((current) => {
        if (
          Math.abs(current.currentTimeSeconds - nextCurrentTime) < 0.05 &&
          Math.abs(current.durationSeconds - nextDuration) < 0.05
        ) {
          return current;
        }

        return {
          currentTimeSeconds: nextCurrentTime,
          durationSeconds: nextDuration,
        };
      });
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [data?.result]);

  const learningCoachTo = useMemo(() => {
    if (isPublicView || !data?.result) return null;
    const sessionId = data.result.taskId?.trim() || taskIdParam?.trim() || '';
    if (!sessionId) return null;

    const coachParams = new URLSearchParams();
    coachParams.set('sourceType', 'video');
    coachParams.set('sourceSessionId', sessionId);
    coachParams.set('sourceTaskId', sessionId);
    coachParams.set('returnTo', `/video/${encodeURIComponent(sessionId)}`);
    if (data.result.title) coachParams.set('topicHint', data.result.title);

    return `/coach/${encodeURIComponent(sessionId)}?${coachParams.toString()}`;
  }, [isPublicView, data?.result, taskIdParam]);

  if (viewStatus === 'loading') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
          <ResultSkeleton />
        </main>
      </div>
    );
  }

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

  if (viewStatus === 'deleted') {
    return (
      <div className="xm-video-result">
        <main className="xm-video-result__canvas">
          <ResultErrorView
            icon={Trash2}
            title="该视频任务已删除"
            message="此任务已被你或平台从学习中心移除，无法再进行回看。"
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

  if (!data?.result) {
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

  const result = data.result;
  const rawPublicUrl = result.publicUrl?.trim() || null;
  const publicUrl =
    rawPublicUrl && !rawPublicUrl.includes('/api/')
      ? rawPublicUrl
      : typeof window !== 'undefined' && result.resultId
        ? `${window.location.origin}/video/public/${result.resultId}`
        : rawPublicUrl;

  return (
    <div className="xm-video-result">
      <main className="xm-video-result__canvas">
        <div className="xm-video-result__ambient">
          <div className="xm-video-result__grid" />
          <div className="xm-video-result__glow" />
        </div>

        <ResultHeader
          title={result.title}
          taskId={result.taskId}
          published={result.published}
          publishLoading={publishLoading}
          onPublish={publish}
          onUnpublish={unpublish}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          readOnly={isPublicView}
          backTo={isPublicView ? null : '/video/input'}
          learningCoachTo={learningCoachTo}
        />

        <div className="xm-video-result__body">
          <VideoProgressBar
            playerRef={playerRef}
            currentTimeSeconds={playbackState.currentTimeSeconds}
            durationSeconds={duration}
            sections={result.sections}
          />

          {bannerVisible ? (
            <PublishBanner
              published={result.published}
              publicUrl={publicUrl}
              publishLoading={publishLoading}
              onPublish={publish}
              onUnpublish={unpublish}
              onDismiss={() => setBannerVisible(false)}
              readOnly={isPublicView}
            />
          ) : null}

          <section className="xm-video-result__stage" data-testid="video-result-stage">
            <div className="xm-video-result__player-shell">
              <div className="xm-video-result__player-frame">
                <VideoPlayer
                  ref={playerRef}
                  videoUrl={result.videoUrl}
                  posterUrl={result.coverUrl}
                  hideControls
                  className="xm-video-result__player"
                />
                {mutedTipVisible ? (
                  <div
                    className="absolute bottom-3 right-3 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur-sm shadow-lg animate-pulse"
                    role="status"
                    aria-live="polite"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>点击视频解除静音</span>
                  </div>
                ) : null}
              </div>

              <VideoDock playerRef={playerRef} />
            </div>
          </section>
        </div>
      </main>

      <CompanionSidebar
        isOpen={sidebarOpen}
        onClose={toggleSidebar}
        taskId={lookupId ?? ''}
        currentAnchor={currentAnchor}
        playerRef={playerRef}
        className="xm-video-result__sidebar"
      />
    </div>
  );
}
