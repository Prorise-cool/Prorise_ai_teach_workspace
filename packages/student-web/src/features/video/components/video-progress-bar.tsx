/**
 * 文件说明：视频结果页顶部进度条组件。
 * 显示当前播放进度，并在进度条上承接 section marker / tooltip / 跳转。
 * Tooltip 向下展开，带箭头指针和果冻动画（对齐设计稿）。
 */
import { Sparkles } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';

import type { VideoResultSection } from '@/types/video';

import {
  buildPlaybackSections,
  resolveSectionSummary,
} from '../utils/result-playback';

import type { VideoPlayerHandle } from './video-player';

export interface VideoProgressBarProps {
  /** 播放器 ref。 */
  playerRef: React.RefObject<VideoPlayerHandle | null>;
  /** 当前播放时间。 */
  currentTimeSeconds: number;
  /** 总时长。 */
  durationSeconds: number;
  /** section marker 源数据。 */
  sections?: VideoResultSection[];
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染视频播放进度条。
 *
 * @param props - 进度条属性。
 * @returns 进度条 UI。
 */
export function VideoProgressBar({
  playerRef,
  currentTimeSeconds,
  durationSeconds,
  sections,
  className,
}: VideoProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timelineSections = useMemo(
    () => buildPlaybackSections(sections, durationSeconds),
    [durationSeconds, sections],
  );
  const progress =
    durationSeconds > 0 ? Math.min((currentTimeSeconds / durationSeconds) * 100, 100) : 0;

  const seekTo = useCallback(
    (seconds: number) => {
      const player = playerRef.current?.getPlayer();

      if (!player) {
        return;
      }

      player.currentTime(seconds);
    },
    [playerRef],
  );

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const track = trackRef.current;

      if (!track || durationSeconds <= 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

      seekTo(ratio * durationSeconds);
    },
    [durationSeconds, seekTo],
  );

  return (
    <div className={className ?? 'xm-video-result__progress'}>
      <div
        ref={trackRef}
        className="xm-video-result__progress-track"
        onClick={handleTrackClick}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {timelineSections.map((section) => {
          const leftPercent =
            durationSeconds > 0
              ? (section.resolvedStartSeconds / durationSeconds) * 100
              : 0;
          const isActive =
            currentTimeSeconds >= section.resolvedStartSeconds &&
            currentTimeSeconds < section.resolvedEndSeconds;

          return (
            <button
              key={section.sectionId}
              type="button"
              className="xm-video-result__progress-marker"
              style={{ left: `${leftPercent}%` }}
              data-active={isActive}
              aria-label={section.title ?? `section-${section.sectionIndex + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                seekTo(section.resolvedStartSeconds);
              }}
            >
              <span className="xm-video-result__progress-marker-dot" />

              <span className="xm-video-result__progress-tooltip" role="status">
                <span className="xm-video-result__progress-tooltip-arrow" />
                <span className="xm-video-result__progress-tooltip-icon-wrap">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <p className="xm-video-result__progress-tooltip-title">
                  {section.title ?? `Section ${section.sectionIndex + 1}`}
                </p>
                <p className="xm-video-result__progress-tooltip-summary">
                  {resolveSectionSummary(section) ?? '...'}
                </p>
              </span>
            </button>
          );
        })}

        <div
          className="xm-video-result__progress-fill"
          style={{ width: `${progress}%` }}
        >
          <div className="xm-video-result__progress-handle" />
        </div>
      </div>
    </div>
  );
}
