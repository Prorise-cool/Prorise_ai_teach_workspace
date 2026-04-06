/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件只承接输入交互和展示状态。
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { Image, Loader2, Mic, Send, Sparkles, X } from 'lucide-react';

import { useFileDropzone } from '@/components/input-page';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';
import {
  VIDEO_INPUT_ACCEPTED_IMAGE_TYPES,
  VIDEO_INPUT_MAX_IMAGE_SIZE,
  type VideoInputFormValues,
} from '@/features/video/schemas/video-input-schema';

type VideoInputCardProps = {
  form: UseFormReturn<VideoInputFormValues>;
  errors: FieldErrors<VideoInputFormValues>;
  isSubmitting: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
  labels: {
    smartMatchHint: string;
    smartMatchDesc: string;
    multiAgentHint: string;
    placeholder: string;
    submitLabel: string;
    toolUploadImage: string;
    toolVoiceInput: string;
  };
};

/**
 * 渲染视频输入卡片。
 *
 * @param props - 组件参数。
 * @returns 视频输入卡片节点。
 */
export function VideoInputCard({
  form,
  errors,
  isSubmitting,
  isRecording,
  onToggleRecording,
  labels,
}: VideoInputCardProps) {
  const { notify } = useFeedback();
  const { register, setValue, watch, clearErrors, setError } = form;
  const inputType = watch('inputType');
  const imageFile = watch('imageFile');
  const textField = register('text');

  const {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop: originalHandleDrop,
    attachedFile,
    clearFile,
    triggerSelect,
    fileInputRef,
    handleFileChange: originalHandleFileChange,
  } = useFileDropzone();

  const acceptedMimeTypes = useMemo(
    () => new Set<string>(VIDEO_INPUT_ACCEPTED_IMAGE_TYPES),
    [],
  );
  const previewUrl = useMemo(() => {
    if (!imageFile) {
      return null;
    }

    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const syncImageFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setValue('inputType', 'text');
        setValue('imageFile', null, { shouldValidate: false });
        return;
      }

      if (!acceptedMimeTypes.has(file.type)) {
        clearFile();
        setError('imageFile', {
          type: 'manual',
          message: '仅支持 JPG、PNG、WebP 格式的图片',
        });
        notify({
          title: '图片格式不支持',
          description: '请上传 JPG、PNG 或 WebP 图片',
          tone: 'error',
        });
        return;
      }

      if (file.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
        clearFile();
        setError('imageFile', {
          type: 'manual',
          message: '图片大小不能超过 10MB',
        });
        notify({
          title: '图片过大',
          description: '请压缩图片后再试',
          tone: 'error',
        });
        return;
      }

      clearErrors(['imageFile', 'text']);
      setValue('inputType', 'image');
      setValue('imageFile', file, { shouldValidate: false });
    },
    [acceptedMimeTypes, clearErrors, clearFile, notify, setError, setValue],
  );

  useEffect(() => {
    if (attachedFile) {
      syncImageFile(attachedFile);
    }
  }, [attachedFile, syncImageFile]);

  const handleClearImage = useCallback(() => {
    clearFile();
    clearErrors('imageFile');
    setValue('inputType', 'text');
    setValue('imageFile', null, { shouldValidate: false });
  }, [clearErrors, clearFile, setValue]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (!item.type.startsWith('image/')) {
          continue;
        }

        const file = item.getAsFile();

        if (file) {
          event.preventDefault();
          syncImageFile(file);
        }

        break;
      }
    },
    [syncImageFile],
  );

  const fieldErrorIds = [
    errors.text ? 'video-input-text-error' : null,
    errors.imageFile ? 'video-input-image-error' : null,
  ].filter(Boolean);
  const describedBy = fieldErrorIds.length > 0 ? fieldErrorIds.join(' ') : undefined;

  return (
    <div className="xm-video-input__card">
      <div className="xm-video-input__card-hints">
        <div className="xm-video-input__card-hint xm-video-input__card-hint--accent">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{labels.smartMatchHint}</span>
          <span className="xm-video-input__card-hint-desc">
            {labels.smartMatchDesc}
          </span>
        </div>
        <div className="xm-video-input__card-hint">
          <span>{labels.multiAgentHint}</span>
        </div>
      </div>

      <div
        className="xm-video-input__card-body relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={originalHandleDrop}
        onPaste={handlePaste}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 m-3 flex flex-col items-center justify-center rounded-[var(--xm-radius-md)] bg-[color:var(--xm-color-surface-glass)] backdrop-blur-sm border-2 border-dashed border-primary">
            <p className="text-sm font-semibold text-primary">松开鼠标，上传参考图片</p>
          </div>
        )}

        {imageFile && inputType === 'image' && (
          <div className="flex items-center justify-between rounded-lg bg-[color:var(--xm-color-surface-sunken)] p-3 border border-[color:var(--xm-color-border-subtle)]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[color:var(--xm-color-surface-highest)] overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={imageFile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-foreground">
                  {imageFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]"
              onClick={handleClearImage}
              title="移除图片"
              aria-label="移除图片"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <textarea
          {...textField}
          className="xm-video-input__card-textarea"
          placeholder={labels.placeholder}
          rows={4}
          aria-invalid={Boolean(errors.text || errors.imageFile)}
          aria-describedby={describedBy}
        />

        {errors.text?.message && (
          <p
            id="video-input-text-error"
            className="mt-1 px-1 text-xs text-destructive"
            role="alert"
          >
            {errors.text.message}
          </p>
        )}

        {errors.imageFile?.message && (
          <p
            id="video-input-image-error"
            className="mt-1 px-1 text-xs text-destructive"
            role="alert"
          >
            {errors.imageFile.message}
          </p>
        )}
      </div>

      <div className="xm-video-input__card-toolbar">
        <div className="xm-video-input__card-tools">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={originalHandleFileChange}
            accept={VIDEO_INPUT_ACCEPTED_IMAGE_TYPES.join(',')}
            aria-label={labels.toolUploadImage}
          />
          <button
            type="button"
            className="xm-video-input__card-tool-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]"
            title={labels.toolUploadImage}
            aria-label={labels.toolUploadImage}
            onClick={triggerSelect}
          >
            <Image className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              'xm-video-input__card-tool-btn relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]',
              isRecording && 'text-primary bg-[color:var(--xm-color-brand-50)]',
            )}
            title={labels.toolVoiceInput}
            aria-label={labels.toolVoiceInput}
            onClick={onToggleRecording}
          >
            {isRecording ? (
              <div className="flex h-4 w-4 items-center justify-center gap-[2px]">
                <span className="h-2 w-[2px] rounded-full bg-current animate-audio-bar-1" />
                <span className="h-4 w-[2px] rounded-full bg-current animate-audio-bar-2" />
                <span className="h-3 w-[2px] rounded-full bg-current animate-audio-bar-3" />
              </div>
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isRecording && (
              <span className="absolute inset-0 rounded-md bg-[color:var(--xm-color-brand-500)] opacity-20 animate-ping" />
            )}
          </button>
        </div>

        <button
          type="submit"
          className={cn(
            'xm-video-input__card-submit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)] focus-visible:ring-offset-2',
            isSubmitting && 'opacity-70 cursor-not-allowed',
          )}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <span>{labels.submitLabel}</span>
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
