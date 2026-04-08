/**
 * 文件说明：macOS Dock 风格播放控制台组件。
 * 毛玻璃 pill shape 悬浮于画布底部，控制播放/暂停、倍速、音量、全屏。
 */
import { Maximize, Pause, Play, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { VideoPlayerHandle } from './video-player';

/** 倍速选项。 */
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export interface VideoDockProps {
  /** 播放器 ref。 */
  playerRef: React.RefObject<VideoPlayerHandle | null>;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染 macOS Dock 播放控制台。
 *
 * @param props - Dock 属性。
 * @returns Dock UI。
 */
export function VideoDock({ playerRef, className }: VideoDockProps) {
  const { t } = useAppTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const checkState = () => {
      const player = playerRef.current?.getPlayer();
      if (player) {
        setIsPlaying(!player.paused());
      }
    };

    const id = setInterval(checkState, 300);

    return () => clearInterval(id);
  }, [playerRef]);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current?.getPlayer();
    if (!player) return;

    if (player.paused()) {
      void player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [playerRef]);

  const handleSpeed = useCallback(() => {
    const player = playerRef.current?.getPlayer();
    if (!player) return;

    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];

    player.playbackRate(nextSpeed);
    setSpeed(nextSpeed);
  }, [playerRef, speed]);

  const handleFullscreen = useCallback(() => {
    const player = playerRef.current?.getPlayer();
    if (!player) return;

    if (player.isFullscreen()) {
      void player.exitFullscreen();
    } else {
      void player.requestFullscreen();
    }
  }, [playerRef]);

  return (
    <div className={className ?? 'xm-video-dock'}>
      <div className="xm-video-dock__island">
        {/* 主播放键 */}
        <button
          className="xm-video-dock__play-btn"
          onClick={handlePlayPause}
          aria-label={isPlaying ? t('video.dock.pause') : t('video.dock.play')}
        >
          {isPlaying ? (
            <Pause className="xm-video-dock__play-icon w-5 h-5 fill-current" />
          ) : (
            <Play className="xm-video-dock__play-icon w-5 h-5 fill-current" />
          )}
        </button>

        {/* 控制按钮组 */}
        <div className="xm-video-dock__controls">
          <button
            className="xm-video-dock__ctrl-btn"
            onClick={handleSpeed}
            aria-label={t('video.dock.speed', { speed })}
          >
            {speed}x
          </button>
          <button
            className="xm-video-dock__ctrl-btn"
            aria-label={t('video.dock.volume')}
          >
            <Volume2 className="w-[18px] h-[18px]" />
          </button>
          <button
            className="xm-video-dock__ctrl-btn"
            onClick={handleFullscreen}
            aria-label={t('video.dock.fullscreen')}
          >
            <Maximize className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
