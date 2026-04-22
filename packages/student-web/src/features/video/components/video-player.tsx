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

function detectVideoMimeType(videoUrl: string) {
  const normalizedUrl = videoUrl.split('#')[0]?.split('?')[0]?.toLowerCase() ?? '';

  if (normalizedUrl.endsWith('.webm')) {
    return 'video/webm';
  }

  if (normalizedUrl.endsWith('.m3u8')) {
    return 'application/x-mpegURL';
  }

  if (normalizedUrl.endsWith('.ogv') || normalizedUrl.endsWith('.ogg')) {
    return 'video/ogg';
  }

  if (normalizedUrl.endsWith('.mov')) {
    return 'video/quicktime';
  }

  return 'video/mp4';
}

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
        // 自动播放：'muted' 表示静音自动播放（绕过浏览器 autoplay policy），
        // 用户看到画面已经在动后会自行取消静音。直接 autoplay:true 在大多数浏览器
        // 会被策略阻断，用户反而看到一个大播放按钮以为需要手动点。
        autoplay: 'muted',
        muted: true,
        sources: [
          {
            src: videoUrl,
            type: detectVideoMimeType(videoUrl),
          },
        ],
      });

      player.on('error', () => {
        console.warn('[VideoPlayer] Media load error:', player.error()?.message);
      });

      // 首次用户交互自动解除静音：autoplay='muted' 进入页面时静音播放（绕过
      // autoplay policy），用户点任何地方（包括 Dock 播放按钮）都会触发
      // 'userinteract' 或 'play'，此时解除静音 + 把 volume 拉回 1
      // 保证视频实际有声
      const unmuteOnFirstInteract = () => {
        if (player.muted()) {
          player.muted(false);
          if (player.volume() === 0) player.volume(1);
        }
      };
      // 监听多个事件覆盖所有可能的首次交互：点击播放器区域、开始播放、点触屏
      player.one("click", unmuteOnFirstInteract);
      player.one("touchend", unmuteOnFirstInteract);
      // 注意：不在 play 事件上 unmute，因为 autoplay='muted' 本身也会触发 play

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
