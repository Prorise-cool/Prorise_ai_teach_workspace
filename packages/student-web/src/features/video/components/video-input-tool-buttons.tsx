/**
 * 文件说明：视频输入卡片 — 图片上传/语音输入工具按钮（从 video-input-card 拆分，wave-1.5 polish）。
 */
import { Image, Mic } from 'lucide-react';
import type { ChangeEventHandler, FC, RefObject } from 'react';

import { cn } from '@/lib/utils';

type VideoInputToolButtonsProps = {
  blockPrefix: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  acceptedMimeTypes: readonly string[];
  onTriggerSelect: () => void;
  hasImage: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
  labels: {
    toolUploadImage: string;
    toolVoiceInput: string;
    recordingLabel: string;
  };
};

export const VideoInputToolButtons: FC<VideoInputToolButtonsProps> = ({
  blockPrefix,
  fileInputRef,
  onFileChange,
  acceptedMimeTypes,
  onTriggerSelect,
  hasImage,
  isRecording,
  onToggleRecording,
  labels,
}) => {
  const toolButtonClassName = `${blockPrefix}-tool-btn`;

  return (
    <>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={onFileChange}
        accept={acceptedMimeTypes.join(',')}
        multiple
        aria-label={labels.toolUploadImage}
      />
      <button
        type="button"
        className={`${toolButtonClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40`}
        title={labels.toolUploadImage}
        aria-label={labels.toolUploadImage}
        onClick={onTriggerSelect}
      >
        <Image className="h-4 w-4" />
        {hasImage ? <span className={`${blockPrefix}-tool-indicator`} /> : null}
      </button>
      <button
        type="button"
        className={cn(
          `${toolButtonClassName} ${blockPrefix}-voice-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40`,
          isRecording && 'is-recording',
        )}
        title={labels.toolVoiceInput}
        aria-label={labels.toolVoiceInput}
        onClick={onToggleRecording}
      >
        <span className={`${blockPrefix}-voice-btn-icon`}>
          <Mic className="h-4 w-4" />
        </span>
        <span className={`${blockPrefix}-voice-btn-wave`} aria-hidden={!isRecording}>
          <span className="h-2 w-[2px] rounded-full bg-current animate-audio-bar-1" />
          <span className="h-4 w-[2px] rounded-full bg-current animate-audio-bar-2" />
          <span className="h-3 w-[2px] rounded-full bg-current animate-audio-bar-3" />
          <span className={`${blockPrefix}-voice-btn-label`}>{labels.recordingLabel}</span>
        </span>
      </button>
    </>
  );
};
