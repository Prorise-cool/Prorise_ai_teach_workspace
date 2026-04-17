/**
 * 文件说明：Video.js 播放器封装组件（Story 4.8 重构版）。
 * 管理 Video.js 实例的初始化、销毁与配置。
 * 支持通过 ref 暴露 player 实例给外部 Dock / ProgressBar 控制。
 * 支持 hideControls 隐藏原生控件（用于 Dock 模式）。
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

import { cn } from '@/lib/utils';

import 'video.js/dist/video-js.css';

/** 支持的倍速选项。 */
const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

/** VideoPlayer 对外暴露的实例句柄。 */
export interface VideoPlayerHandle {
  /** 获取底层 Video.js player 实例。 */
  getPlayer: () => Player | null;
}

export interface VideoPlayerProps {
  /** 视频资源 URL。 */
  videoUrl: string;
  /** 封面图 URL。 */
  posterUrl?: string;
  /** 是否隐藏原生控件（Dock 模式下为 true）。 */
  hideControls?: boolean;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染 Video.js 播放器。
 * 组件卸载时正确销毁 Video.js 实例，防止内存泄漏。
 * videoUrl 变更时重新初始化。
 *
 * @param props - 播放器属性。
 * @param ref - 外部 ref，暴露 VideoPlayerHandle。
 * @returns Video.js 播放器 UI。
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ videoUrl, posterUrl, hideControls = false, className }, ref) {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);

    useImperativeHandle(ref, () => ({
      getPlayer: () => playerRef.current,
    }));

    useEffect(() => {
      if (!videoRef.current) {
        return;
      }

      let cancelled = false;

      const videoElement = document.createElement('video-js');

      videoElement.classList.add('vjs-big-play-centered');

      if (cancelled) {
        return;
      }

      videoRef.current.appendChild(videoElement);

      const player = videojs(videoElement, {
        controls: !hideControls,
        responsive: true,
        fluid: false,
        fill: true,
        playbackRates: PLAYBACK_RATES,
        poster: posterUrl,
        sources: [
          {
            src: videoUrl,
            type: 'video/mp4',
          },
        ],
      });

      player.on('error', () => {
        console.warn('[VideoPlayer] Media load error:', player.error()?.message);
      });

      playerRef.current = player;

      return () => {
        cancelled = true;
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      };
    }, [videoUrl, posterUrl, hideControls]);

    return (
      <div
        ref={videoRef}
        className={cn('video-player-container', className)}
        data-vjs-player
      />
    );
  },
);
