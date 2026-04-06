/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件只承接输入交互和展示状态。
 * 支持多图上传，预览以 grid 缩略图形式展示。
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { Image, Loader2, Mic, Send, X } from 'lucide-react';

import {
  createInputWorkspaceCardClassNames,
  InputWorkspaceCardFrame,
} from '@/components/input-page/input-workspace-card-frame';
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
  const classNames = createInputWorkspaceCardClassNames('xm-video-input');
  const { register, setValue, watch, clearErrors, setError } = form;
  const inputType = watch('inputType');
  const imageFiles = watch('imageFiles');
  const textField = register('text');

  const {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop: originalHandleDrop,
    attachedFiles,
    clearFiles,
    triggerSelect,
    fileInputRef,
    handleFileChange: originalHandleFileChange,
  } = useFileDropzone({ multiple: true });

  const acceptedMimeTypes = useMemo(
    () => new Set<string>(VIDEO_INPUT_ACCEPTED_IMAGE_TYPES),
    [],
  );

  const previewUrls = useMemo(() => {
    return imageFiles.map((file) => URL.createObjectURL(file));
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  /**
   * 将新文件追加到表单 imageFiles 中，校验格式和大小。
   */
  const addImageFiles = useCallback(
    (files: File[]) => {
      const valid: File[] = [];

      for (const file of files) {
        if (!acceptedMimeTypes.has(file.type)) {
          setError('imageFiles', {
            type: 'manual',
            message: '仅支持 JPG、PNG、WebP 格式的图片',
          });
          notify({
            title: '图片格式不支持',
            description: `${file.name} 不是支持的图片格式，请上传 JPG、PNG 或 WebP`,
            tone: 'error',
          });
          continue;
        }

        if (file.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
          setError('imageFiles', {
            type: 'manual',
            message: '图片大小不能超过 30MB',
          });
          notify({
            title: '图片过大',
            description: `${file.name} 超过 30MB，请压缩后再试`,
            tone: 'error',
          });
          continue;
        }

        valid.push(file);
      }

      if (valid.length === 0) {
        return;
      }

      clearErrors(['imageFiles', 'text']);
      const current = form.getValues('imageFiles');
      const merged = [...current, ...valid];
      setValue('inputType', 'image');
      setValue('imageFiles', merged, { shouldValidate: false });
    },
    [acceptedMimeTypes, clearErrors, form, notify, setError, setValue],
  );

  /* 同步 dropzone attachedFiles 到表单 */
  useEffect(() => {
    if (attachedFiles.length > 0) {
      addImageFiles(attachedFiles);
      clearFiles();
    }
  }, [attachedFiles, addImageFiles, clearFiles]);

  const removeImage = useCallback(
    (index: number) => {
      const current = form.getValues('imageFiles');
      const next = current.filter((_, i) => i !== index);
      setValue('imageFiles', next, { shouldValidate: false });

      if (next.length === 0) {
        setValue('inputType', 'text');
        clearErrors('imageFiles');
      }
    },
    [clearErrors, form, setValue],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;

      if (!items) {
        return;
      }

      const pastedFiles: File[] = [];

      for (const item of items) {
        if (!item.type.startsWith('image/')) {
          continue;
        }

        const file = item.getAsFile();

        if (file) {
          pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        event.preventDefault();
        addImageFiles(pastedFiles);
      }
    },
    [addImageFiles],
  );

  const fieldErrorIds = [
    errors.text ? 'video-input-text-error' : null,
    errors.imageFiles ? 'video-input-image-error' : null,
  ].filter(Boolean);
  const describedBy = fieldErrorIds.length > 0 ? fieldErrorIds.join(' ') : undefined;
  const toolButtonClassName = `${classNames.root}-tool-btn`;
  const submitClassName = `${classNames.root}-submit`;

  return (
    <InputWorkspaceCardFrame
      block="xm-video-input"
      smartMatchHint={labels.smartMatchHint}
      smartMatchDesc={labels.smartMatchDesc}
      multiAgentHint={labels.multiAgentHint}
      dragOverlayLabel="松开鼠标，上传参考图片"
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={originalHandleDrop}
      onPaste={handlePaste}
      body={
        <>
          {imageFiles.length > 0 && inputType === 'image' ? (
            <div className={`${classNames.root}-image-grid`}>
              {imageFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className={`${classNames.root}-image-thumb`}
                >
                  <img
                    src={previewUrls[index]}
                    alt={file.name}
                    className={`${classNames.root}-image-thumb-img`}
                  />
                  <span className="sr-only">{file.name}</span>
                  <button
                    type="button"
                    className={`${classNames.root}-image-thumb-remove`}
                    onClick={() => removeImage(index)}
                    title="移除图片"
                    aria-label={`移除图片 ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <textarea
            {...textField}
            className={`${classNames.root}-textarea`}
            placeholder={labels.placeholder}
            rows={4}
            aria-invalid={Boolean(errors.text || errors.imageFiles)}
            aria-describedby={describedBy}
          />

          {errors.text?.message ? (
            <p
              id="video-input-text-error"
              className="mt-1 px-1 text-xs text-destructive"
              role="alert"
            >
              {errors.text.message}
            </p>
          ) : null}

          {errors.imageFiles?.message ? (
            <p
              id="video-input-image-error"
              className="mt-1 px-1 text-xs text-destructive"
              role="alert"
            >
              {errors.imageFiles.message}
            </p>
          ) : null}
        </>
      }
      tools={
        <>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={originalHandleFileChange}
            accept={VIDEO_INPUT_ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            aria-label={labels.toolUploadImage}
          />
          <button
            type="button"
            className={`${toolButtonClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]`}
            title={labels.toolUploadImage}
            aria-label={labels.toolUploadImage}
            onClick={triggerSelect}
          >
            <Image className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              `${toolButtonClassName} relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]`,
              isRecording && 'text-primary bg-[color:var(--xm-color-brand-50)]'
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
            {isRecording ? (
              <span className="absolute inset-0 rounded-md bg-[color:var(--xm-color-brand-500)] opacity-20 animate-ping" />
            ) : null}
          </button>
        </>
      }
      submitAction={
        <button
          type="submit"
          className={cn(
            `${submitClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)] focus-visible:ring-offset-2`,
            isSubmitting && 'opacity-70 cursor-not-allowed'
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
      }
    />
  );
}
