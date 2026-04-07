/**
 * 文件说明：视频结果页顶部进度条组件。
 * 显示当前播放进度，支持点击定位。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type Player from 'video.js/dist/types/player';

import type { VideoPlayerHandle } from './video-player';

export interface VideoProgressBarProps {
  /** 播放器 ref。 */
  playerRef: React.RefObject<VideoPlayerHandle | null>;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染视频播放进度条。
 *
 * @param props - 进度条属性。
 * @returns 进度条 UI。
 */
export function VideoProgressBar({ playerRef, className }: VideoProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let player: Player | null = null;

    const tick = () => {
      player = playerRef.current?.getPlayer() ?? null;
      if (player) {
        const current = player.currentTime() ?? 0;
        const total = player.duration() ?? 0;

        setProgress(total > 0 ? (current / total) * 100 : 0);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [playerRef]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      const player = playerRef.current?.getPlayer();
      if (!track || !player) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const duration = player.duration() ?? 0;

      if (duration > 0) {
        player.currentTime(ratio * duration);
      }
    },
    [playerRef],
  );

  return (
    <div className={className ?? 'xm-video-result__progress'}>
      <div
        ref={trackRef}
        className="xm-video-result__progress-track"
        onClick={handleClick}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
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
