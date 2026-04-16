/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件承接题目输入、质量预设与高级参数调整。
 */
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import { Image, Loader2, Mic, Settings2, Send, X } from 'lucide-react';

import {
  InputWorkspaceCardFrame,
} from '@/components/input-page/input-workspace-card-frame';
import { createInputWorkspaceCardClassNames } from '@/components/input-page/input-workspace-card-class-names';
import { useFileDropzone } from '@/components/input-page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFeedback } from '@/shared/feedback';
import {
  VIDEO_INPUT_ACCEPTED_IMAGE_TYPES,
  VIDEO_INPUT_MAX_IMAGE_SIZE,
  type VideoInputFormValues,
} from '@/features/video/schemas/video-input-schema';
import {
  VIDEO_QUALITY_PRESET_DEFAULTS,
  type VideoLayoutHint,
  type VideoQualityPreset,
  type VideoRenderQuality,
} from '@/types/video';

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
    qualityPresetLabel: string;
    qualityPresetHint: string;
    advancedSettingsLabel: string;
    presetQuick: string;
    presetBalanced: string;
    presetCinematic: string;
    advancedTitle: string;
    advancedDescription: string;
    advancedReset: string;
    advancedDone: string;
    durationLabel: string;
    sectionCountLabel: string;
    concurrencyLabel: string;
    renderQualityLabel: string;
    layoutHintLabel: string;
    renderQuickLabel: string;
    renderBalancedLabel: string;
    renderHighLabel: string;
    layoutCenterLabel: string;
    layoutTwoColumnLabel: string;
  };
  textAreaRef?: MutableRefObject<HTMLTextAreaElement | null>;
};

export function VideoInputCard({
  form,
  errors,
  isSubmitting,
  isRecording,
  onToggleRecording,
  labels,
  textAreaRef,
}: VideoInputCardProps) {
  const { notify } = useFeedback();
  const classNames = createInputWorkspaceCardClassNames('xm-video-input');
  const { register, setValue, watch, clearErrors, setError } = form;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const inputType = watch('inputType');
  const imageFiles = watch('imageFiles');
  const qualityPreset = watch('qualityPreset');
  const durationMinutes = watch('durationMinutes');
  const sectionCount = watch('sectionCount');
  const sectionConcurrency = watch('sectionConcurrency');
  const renderQuality = watch('renderQuality');
  const layoutHint = watch('layoutHint');
  const textField = register('text');
  const durationField = register('durationMinutes', { valueAsNumber: true });
  const sectionCountField = register('sectionCount', { valueAsNumber: true });
  const sectionConcurrencyField = register('sectionConcurrency', { valueAsNumber: true });
  const renderQualityField = register('renderQuality');
  const layoutHintField = register('layoutHint');

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

  const presetLabelMap: Record<VideoQualityPreset, string> = {
    fast: labels.presetQuick,
    balanced: labels.presetBalanced,
    cinematic: labels.presetCinematic,
  };
  const renderQualityLabelMap: Record<VideoRenderQuality, string> = {
    l: labels.renderQuickLabel,
    m: labels.renderBalancedLabel,
    h: labels.renderHighLabel,
  };
  const layoutHintLabelMap: Record<VideoLayoutHint, string> = {
    center_stage: labels.layoutCenterLabel,
    two_column: labels.layoutTwoColumnLabel,
  };

  const applyPreset = useCallback(
    (preset: VideoQualityPreset) => {
      const defaults = VIDEO_QUALITY_PRESET_DEFAULTS[preset];

      setValue('qualityPreset', preset, { shouldDirty: true, shouldTouch: true });
      setValue('durationMinutes', defaults.durationMinutes, { shouldDirty: true, shouldTouch: true });
      setValue('sectionCount', defaults.sectionCount, { shouldDirty: true, shouldTouch: true });
      setValue('sectionConcurrency', defaults.sectionConcurrency, { shouldDirty: true, shouldTouch: true });
      setValue('renderQuality', defaults.renderQuality, { shouldDirty: true, shouldTouch: true });
      setValue('layoutHint', defaults.layoutHint, { shouldDirty: true, shouldTouch: true });
      clearErrors([
        'durationMinutes',
        'sectionCount',
        'sectionConcurrency',
        'renderQuality',
        'layoutHint',
      ]);
    },
    [clearErrors, setValue],
  );

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
    errors.durationMinutes ? 'video-input-duration-error' : null,
    errors.sectionCount ? 'video-input-section-count-error' : null,
    errors.sectionConcurrency ? 'video-input-section-concurrency-error' : null,
    errors.renderQuality ? 'video-input-render-quality-error' : null,
    errors.layoutHint ? 'video-input-layout-hint-error' : null,
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
          <div className={`${classNames.root}-preset-panel`}>
            <div className={`${classNames.root}-preset-head`}>
              <div className="space-y-1">
                <p className={`${classNames.root}-preset-label`}>{labels.qualityPresetLabel}</p>
                <p className={`${classNames.root}-preset-hint`}>{labels.qualityPresetHint}</p>
              </div>
              <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="surface" size="sm">
                    <Settings2 className="h-4 w-4" />
                    {labels.advancedSettingsLabel}
                  </Button>
                </DialogTrigger>
                <DialogContent className="xm-video-input__advanced-dialog">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <DialogTitle>{labels.advancedTitle}</DialogTitle>
                      <DialogDescription>{labels.advancedDescription}</DialogDescription>
                    </div>

                    <div className="xm-video-input__advanced-grid">
                      <div className="xm-video-input__advanced-field">
                        <Label htmlFor="video-duration-minutes">{labels.durationLabel}</Label>
                        <Input
                          id="video-duration-minutes"
                          type="number"
                          min={1}
                          max={10}
                          {...durationField}
                        />
                        {errors.durationMinutes?.message ? (
                          <p id="video-input-duration-error" className="text-xs text-destructive">
                            {errors.durationMinutes.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="xm-video-input__advanced-field">
                        <Label htmlFor="video-section-count">{labels.sectionCountLabel}</Label>
                        <Input
                          id="video-section-count"
                          type="number"
                          min={1}
                          max={12}
                          {...sectionCountField}
                        />
                        {errors.sectionCount?.message ? (
                          <p id="video-input-section-count-error" className="text-xs text-destructive">
                            {errors.sectionCount.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="xm-video-input__advanced-field">
                        <Label htmlFor="video-section-concurrency">{labels.concurrencyLabel}</Label>
                        <Input
                          id="video-section-concurrency"
                          type="number"
                          min={1}
                          max={8}
                          {...sectionConcurrencyField}
                        />
                        {errors.sectionConcurrency?.message ? (
                          <p
                            id="video-input-section-concurrency-error"
                            className="text-xs text-destructive"
                          >
                            {errors.sectionConcurrency.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="xm-video-input__advanced-field">
                        <Label htmlFor="video-render-quality">{labels.renderQualityLabel}</Label>
                        <select
                          id="video-render-quality"
                          className={`${classNames.root}-select`}
                          {...renderQualityField}
                        >
                          <option value="l">{labels.renderQuickLabel}</option>
                          <option value="m">{labels.renderBalancedLabel}</option>
                          <option value="h">{labels.renderHighLabel}</option>
                        </select>
                        {errors.renderQuality?.message ? (
                          <p id="video-input-render-quality-error" className="text-xs text-destructive">
                            {errors.renderQuality.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
                        <Label htmlFor="video-layout-hint">{labels.layoutHintLabel}</Label>
                        <select
                          id="video-layout-hint"
                          className={`${classNames.root}-select`}
                          {...layoutHintField}
                        >
                          <option value="center_stage">{labels.layoutCenterLabel}</option>
                          <option value="two_column">{labels.layoutTwoColumnLabel}</option>
                        </select>
                        {errors.layoutHint?.message ? (
                          <p id="video-input-layout-hint-error" className="text-xs text-destructive">
                            {errors.layoutHint.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="surface"
                        size="sm"
                        onClick={() => applyPreset(qualityPreset)}
                      >
                        {labels.advancedReset}
                      </Button>
                      <Button type="button" size="sm" onClick={() => setIsAdvancedOpen(false)}>
                        {labels.advancedDone}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className={`${classNames.root}-preset-controls`}>
              <label htmlFor="video-quality-preset" className="sr-only">
                {labels.qualityPresetLabel}
              </label>
              <select
                id="video-quality-preset"
                value={qualityPreset}
                className={`${classNames.root}-select`}
                onChange={(event) => applyPreset(event.target.value as VideoQualityPreset)}
              >
                <option value="fast">{labels.presetQuick}</option>
                <option value="balanced">{labels.presetBalanced}</option>
                <option value="cinematic">{labels.presetCinematic}</option>
              </select>
            </div>

            <div className={`${classNames.root}-preset-summary`} aria-live="polite">
              <span className={`${classNames.root}-preset-chip`}>
                {presetLabelMap[qualityPreset]}
              </span>
              <span className={`${classNames.root}-preset-chip`}>
                {durationMinutes} 分钟
              </span>
              <span className={`${classNames.root}-preset-chip`}>
                {sectionCount} 段
              </span>
              <span className={`${classNames.root}-preset-chip`}>
                并发 {sectionConcurrency}
              </span>
              <span className={`${classNames.root}-preset-chip`}>
                {renderQualityLabelMap[renderQuality]}
              </span>
              <span className={`${classNames.root}-preset-chip`}>
                {layoutHintLabelMap[layoutHint]}
              </span>
            </div>
          </div>

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
            ref={(node) => {
              textField.ref(node);

              if (textAreaRef) {
                textAreaRef.current = node;
              }
            }}
            className={`${classNames.root}-textarea`}
            placeholder={labels.placeholder}
            rows={4}
            aria-invalid={Boolean(
              errors.text ||
                errors.imageFiles ||
                errors.durationMinutes ||
                errors.sectionCount ||
                errors.sectionConcurrency,
            )}
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
      }
    />
  );
}
