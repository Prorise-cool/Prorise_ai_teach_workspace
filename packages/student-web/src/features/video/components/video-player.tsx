/**
 * 文件说明：Video.js 播放器封装组件（Story 4.8）。
 * 管理 Video.js 实例的初始化、销毁与配置。
 * 支持倍速切换（0.5x/1x/1.5x/2x）、全屏、进度条拖动。
 */
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

import { cn } from '@/lib/utils';

import 'video.js/dist/video-js.css';

/** 支持的倍速选项。 */
const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

export interface VideoPlayerProps {
  /** 视频资源 URL。 */
  videoUrl: string;
  /** 封面图 URL。 */
  posterUrl?: string;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染 Video.js 播放器。
 * 组件卸载时正确销毁 Video.js 实例，防止内存泄漏。
 * videoUrl 变更时重新初始化。
 *
 * @param props - 播放器属性。
 * @returns Video.js 播放器 UI。
 */
export function VideoPlayer({ videoUrl, posterUrl, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    /** 防止 videoUrl 快速变更导致 stale effect 追加 DOM 节点。 */
    let cancelled = false;

    const videoElement = document.createElement('video-js');

    videoElement.classList.add('vjs-big-play-centered');

    if (cancelled) {
      return;
    }

    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      responsive: true,
      fluid: true,
      playbackRates: PLAYBACK_RATES,
      poster: posterUrl,
      sources: [
        {
          src: videoUrl,
          type: 'video/mp4',
        },
      ],
    });

    playerRef.current = player;

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl, posterUrl]);

  return (
    <div
      ref={videoRef}
      className={cn('video-player-container', className)}
      data-vjs-player
    />
  );
}
