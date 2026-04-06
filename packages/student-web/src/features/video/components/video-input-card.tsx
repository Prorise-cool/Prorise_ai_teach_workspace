/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 承接文本输入、图片上传/粘贴/拖拽、工具栏与主 CTA 按钮。
 * 页面容器通过 react-hook-form 控制表单状态，本组件只负责展示与交互。
 */
import { useCallback, useEffect, useRef } from 'react';
import type { UseFormReturn, FieldErrors } from 'react-hook-form';
import { FileText, Image, Loader2, Mic, Send, Sparkles, X } from 'lucide-react';

import { useFileDropzone } from '@/components/input-page';
import { cn } from '@/lib/utils';
import type { VideoInputFormValues } from '@/features/video/schemas/video-input-schema';
import {
  VIDEO_INPUT_ACCEPTED_IMAGE_TYPES,
  VIDEO_INPUT_MAX_IMAGE_SIZE,
} from '@/features/video/schemas/video-input-schema';

/** VideoInputCard 组件 props。 */
interface VideoInputCardProps {
  /** react-hook-form 表单实例。 */
  form: UseFormReturn<VideoInputFormValues>;
  /** 表单字段校验错误。 */
  errors: FieldErrors<VideoInputFormValues>;
  /** 是否正在提交。 */
  isSubmitting: boolean;
  /** 语音录入中标记。 */
  isRecording: boolean;
  /** 切换语音录入。 */
  onToggleRecording: () => void;
  /** 表单提交回调。 */
  onSubmit: () => void;
  /** i18n 文案。 */
  labels: {
    smartMatchHint: string;
    smartMatchDesc: string;
    multiAgentHint: string;
    placeholder: string;
    submitLabel: string;
    toolUploadImage: string;
    toolVoiceInput: string;
  };
}

/**
 * 视频输入页核心输入卡片。
 * 支持文本输入、图片拖拽/选择/粘贴三种输入方式。
 *
 * @param props - 组件参数。
 * @returns 核心输入卡片节点。
 */
export function VideoInputCard({
  form,
  errors,
  isSubmitting,
  isRecording,
  onToggleRecording,
  onSubmit,
  labels,
}: VideoInputCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { register, setValue, watch } = form;
  const inputType = watch('inputType');
  const imageFile = watch('imageFile');

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

  /**
   * 将 useFileDropzone 的文件附加状态同步到表单。
   */
  useEffect(() => {
    if (attachedFile) {
      const acceptedTypes = VIDEO_INPUT_ACCEPTED_IMAGE_TYPES as readonly string[];

      if (
        acceptedTypes.includes(attachedFile.type) &&
        attachedFile.size <= VIDEO_INPUT_MAX_IMAGE_SIZE
      ) {
        setValue('inputType', 'image');
        setValue('imageFile', attachedFile, { shouldValidate: false });
      }
    } else {
      if (inputType === 'image') {
        setValue('inputType', 'text');
        setValue('imageFile', null);
      }
    }
  }, [attachedFile, setValue, inputType]);

  /**
   * 清除图片附件，恢复文本输入模式。
   */
  const handleClearImage = useCallback(() => {
    clearFile();
    setValue('inputType', 'text');
    setValue('imageFile', null);
    form.clearErrors('imageFile');
  }, [clearFile, setValue, form]);

  /**
   * 监听粘贴事件，支持从剪贴板粘贴图片。
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const acceptedTypes = VIDEO_INPUT_ACCEPTED_IMAGE_TYPES as readonly string[];

            if (!acceptedTypes.includes(file.type)) {
              return;
            }

            if (file.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
              return;
            }

            setValue('inputType', 'image');
            setValue('imageFile', file, { shouldValidate: false });
            /* 手动同步到 useFileDropzone 的内部状态 - 通过触发一个合成事件 */
            originalHandleDrop({
              preventDefault: () => {},
              stopPropagation: () => {},
              dataTransfer: {
                files: [file] as unknown as FileList,
                types: ['Files'],
              },
            } as unknown as React.DragEvent);
          }
          break;
        }
      }
    },
    [setValue, originalHandleDrop],
  );

  /** 计算主提交按钮的首要 inline 错误文案。 */
  const inlineError =
    errors.text?.message ?? errors.imageFile?.message ?? null;

  return (
    <div className="xm-video-input__card">
      {/* 智能匹配提示栏 */}
      <div className="xm-video-input__card-hints">
        <div className="xm-video-input__card-hint xm-video-input__card-hint--accent">
          <Sparkles className={cn('h-3.5 w-3.5')} />
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
        className={cn('xm-video-input__card-body', 'relative')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={originalHandleDrop}
        onPaste={handlePaste}
      >
        {/* 拖拽覆盖提示 */}
        {isDragging && (
          <div
            className={cn(
              'absolute inset-0 z-10 m-3 flex flex-col items-center justify-center',
              'rounded-[var(--xm-radius-md)]',
              'bg-[color:var(--xm-color-surface-glass)] backdrop-blur-sm',
              'border-2 border-dashed border-primary',
            )}
          >
            <p className={cn('text-sm font-semibold text-primary')}>
              松开鼠标，上传参考图片
            </p>
          </div>
        )}

        {/* 图片附件预览区 */}
        {imageFile && inputType === 'image' && (
          <div
            className={cn(
              'flex items-center justify-between rounded-lg p-3 border',
              'bg-[color:var(--xm-color-surface-sunken)]',
              'border-[color:var(--xm-color-border-subtle)]',
            )}
          >
            <div className={cn('flex items-center gap-3 overflow-hidden')}>
              {/* 图片缩略图预览 */}
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center',
                  'rounded-md bg-[color:var(--xm-color-surface-highest)] overflow-hidden',
                )}
              >
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt={imageFile.name}
                  className={cn('h-full w-full object-cover')}
                />
              </div>
              <div className={cn('flex flex-col overflow-hidden')}>
                <span
                  className={cn('truncate text-sm font-medium text-foreground')}
                >
                  {imageFile.name}
                </span>
                <span className={cn('text-xs text-muted-foreground')}>
                  {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              type="button"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]',
              )}
              onClick={handleClearImage}
              title="移除图片"
              aria-label="移除图片"
            >
              <X className={cn('h-4 w-4')} />
            </button>
          </div>
        )}

        {/* 文本输入区 */}
        <textarea
          {...register('text')}
          ref={(el) => {
            register('text').ref(el);
            (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          }}
          className={cn(
            'xm-video-input__card-textarea',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)] focus-visible:ring-offset-1',
          )}
          placeholder={labels.placeholder}
          rows={4}
          aria-invalid={!!errors.text}
          aria-describedby={errors.text ? 'video-input-text-error' : undefined}
        />

        {/* Inline 校验错误 */}
        {inlineError && (
          <p
            id="video-input-text-error"
            className={cn('text-xs text-destructive mt-1 px-1')}
            role="alert"
          >
            {inlineError}
          </p>
        )}
      </div>

      {/* 工具栏 */}
      <div className="xm-video-input__card-toolbar">
        <div className="xm-video-input__card-tools">
          <input
            type="file"
            className={cn('hidden')}
            ref={fileInputRef}
            onChange={originalHandleFileChange}
            accept={VIDEO_INPUT_ACCEPTED_IMAGE_TYPES.join(',')}
          />
          <button
            type="button"
            className={cn(
              'xm-video-input__card-tool-btn',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]',
            )}
            title={labels.toolUploadImage}
            aria-label={labels.toolUploadImage}
            onClick={triggerSelect}
          >
            <Image className={cn('h-4 w-4')} />
          </button>
          <button
            type="button"
            className={cn(
              'xm-video-input__card-tool-btn relative',
              isRecording && 'text-primary bg-[color:var(--xm-color-brand-50)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]',
            )}
            title={labels.toolVoiceInput}
            aria-label={labels.toolVoiceInput}
            onClick={onToggleRecording}
          >
            {isRecording ? (
              <div
                className={cn(
                  'flex items-center justify-center gap-[2px] h-4 w-4',
                )}
              >
                <span
                  className={cn(
                    'w-[2px] h-2 bg-current rounded-full animate-audio-bar-1',
                  )}
                />
                <span
                  className={cn(
                    'w-[2px] h-4 bg-current rounded-full animate-audio-bar-2',
                  )}
                />
                <span
                  className={cn(
                    'w-[2px] h-3 bg-current rounded-full animate-audio-bar-3',
                  )}
                />
              </div>
            ) : (
              <Mic className={cn('h-4 w-4')} />
            )}
            {isRecording && (
              <span
                className={cn(
                  'absolute inset-0 rounded-md',
                  'bg-[color:var(--xm-color-brand-500)] opacity-20 animate-ping',
                )}
              />
            )}
          </button>
        </div>

        {/* 主 CTA */}
        <button
          type="submit"
          className={cn(
            'xm-video-input__card-submit',
            isSubmitting && 'opacity-70 cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)] focus-visible:ring-offset-2',
          )}
          disabled={isSubmitting}
          onClick={onSubmit}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className={cn('h-4 w-4 animate-spin')} />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <span>{labels.submitLabel}</span>
              <Send className={cn('h-4 w-4')} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
