/**
 * 文件说明：视频底部字幕浮层组件。
 * 深色半透明安全带，居中显示当前 section/TTS 字幕文本。
 */
import { cn } from '@/lib/utils';

export interface VideoSubtitleProps {
  /** 字幕文本。 */
  text?: string;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染底部字幕浮层。
 * 字幕为空时不渲染。
 *
 * @param props - 字幕属性。
 * @returns 字幕 UI 或 null。
 */
export function VideoSubtitle({ text, className }: VideoSubtitleProps) {
  if (!text) return null;

  return (
    <div className={cn('xm-video-result__subtitle', className)} aria-live="polite">
      {text}
    </div>
  );
}
