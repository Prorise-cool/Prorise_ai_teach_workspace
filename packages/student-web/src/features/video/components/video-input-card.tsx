/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件承接题目输入、图片上传、预设切换与高级参数调整。
 */
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { type FieldErrors, type UseFormReturn } from 'react-hook-form';
import {
  ArrowRight,
  ChevronDown,
  Image,
  Loader2,
  Mic,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  InputWorkspaceCardFrame,
} from '@/components/input-page/input-workspace-card-frame';
import { createInputWorkspaceCardClassNames } from '@/components/input-page/input-workspace-card-class-names';
import { useFileDropzone } from '@/components/input-page';
import {
  Dialog,
  DialogClose,
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
  VIDEO_TEXT_MAX_LENGTH,
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
    recordingLabel: string;
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
    durationUnit: string;
    sectionUnit: string;
    concurrencyShortLabel: string;
  };
  textAreaRef?: MutableRefObject<HTMLTextAreaElement | null>;
};

const QUALITY_PRESET_SEQUENCE: VideoQualityPreset[] = [
  'fast',
  'balanced',
  'cinematic',
];

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
  const { t } = useAppTranslation();
  const classNames = createInputWorkspaceCardClassNames('xm-video-input');
  const { register, setValue, watch, clearErrors, setError } = form;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const inputType = watch('inputType');
  const imageFiles = watch('imageFiles');
  const textValue = watch('text') ?? '';
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

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

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

  const renderQualityOptions: Array<{ value: VideoRenderQuality; label: string }> = [
    { value: 'l', label: labels.renderQuickLabel },
    { value: 'm', label: labels.renderBalancedLabel },
    { value: 'h', label: labels.renderHighLabel },
  ];

  const layoutHintOptions: Array<{ value: VideoLayoutHint; label: string }> = [
    { value: 'center_stage', label: labels.layoutCenterLabel },
    { value: 'two_column', label: labels.layoutTwoColumnLabel },
  ];

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
            message: t('videoInput.validation.imageType'),
          });
          notify({
            title: t('videoInput.feedback.unsupportedImageTitle'),
            description: t('videoInput.feedback.unsupportedImageDescription', { name: file.name }),
            tone: 'error',
          });
          continue;
        }

        if (file.size > VIDEO_INPUT_MAX_IMAGE_SIZE) {
          setError('imageFiles', {
            type: 'manual',
            message: t('videoInput.validation.imageSize'),
          });
          notify({
            title: t('videoInput.feedback.imageTooLargeTitle'),
            description: t('videoInput.feedback.imageTooLargeDescription', { name: file.name }),
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
    [acceptedMimeTypes, clearErrors, form, notify, setError, setValue, t],
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
  ].filter(Boolean);
  const describedBy = fieldErrorIds.length > 0 ? fieldErrorIds.join(' ') : undefined;
  const toolButtonClassName = `${classNames.root}-tool-btn`;
  const submitClassName = `${classNames.root}-submit`;
  const parameterSummary = `${presetLabelMap[qualityPreset]} · ${durationMinutes}${labels.durationUnit} · ${renderQualityLabelMap[renderQuality]}`;

  return (
    <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
      <div className="xm-video-input__card-stack">
        <DialogTrigger asChild>
          <button
            type="button"
            className="xm-video-input__param-ear focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40"
            aria-label={labels.advancedSettingsLabel}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="xm-video-input__param-ear-text">{parameterSummary}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>

        <InputWorkspaceCardFrame
          block="xm-video-input"
          smartMatchHint={labels.smartMatchHint}
          smartMatchDesc={labels.smartMatchDesc}
          multiAgentHint={labels.multiAgentHint}
          dragOverlayLabel={t('videoInput.dragOverlayLabel')}
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
                        title={t('videoInput.removeImageLabel')}
                        aria-label={t('videoInput.removeImageLabel')}
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

              <div className={`${classNames.root}-meta`} aria-live="polite">
                <span className={`${classNames.root}-char-count`}>
                  {textValue.length}/{VIDEO_TEXT_MAX_LENGTH}
                </span>
              </div>
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
                className={`${toolButtonClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40`}
                title={labels.toolUploadImage}
                aria-label={labels.toolUploadImage}
                onClick={triggerSelect}
              >
                <Image className="h-4 w-4" />
                {imageFiles.length > 0 ? (
                  <span className={`${classNames.root}-tool-indicator`} />
                ) : null}
              </button>
              <button
                type="button"
                className={cn(
                  `${toolButtonClassName} ${classNames.root}-voice-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40`,
                  isRecording && 'is-recording',
                )}
                title={labels.toolVoiceInput}
                aria-label={labels.toolVoiceInput}
                onClick={onToggleRecording}
              >
                <span className={`${classNames.root}-voice-btn-icon`}>
                  <Mic className="h-4 w-4" />
                </span>
                <span className={`${classNames.root}-voice-btn-wave`} aria-hidden={!isRecording}>
                  <span className="h-2 w-[2px] rounded-full bg-current animate-audio-bar-1" />
                  <span className="h-4 w-[2px] rounded-full bg-current animate-audio-bar-2" />
                  <span className="h-3 w-[2px] rounded-full bg-current animate-audio-bar-3" />
                  <span className={`${classNames.root}-voice-btn-label`}>
                    {labels.recordingLabel}
                  </span>
                </span>
              </button>
            </>
          }
          submitAction={
            <button
              type="submit"
              className={cn(
                `${submitClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-color-ring)]/40 focus-visible:ring-offset-2`,
                isSubmitting && 'opacity-70 cursor-not-allowed',
              )}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('videoInput.submittingLabel')}</span>
                </>
              ) : (
                <>
                  <span>{labels.submitLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          }
        />
      </div>

      <DialogContent className="xm-video-input__advanced-dialog">
        <div className="xm-video-input__advanced-dialog-head">
          <div className="xm-video-input__advanced-dialog-title-row">
            <div className="xm-video-input__advanced-dialog-title-group">
              <SlidersHorizontal className="xm-video-input__advanced-dialog-title-icon h-4 w-4" />
              <DialogTitle>{labels.advancedTitle}</DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="xm-video-input__advanced-close"
                aria-label={t('common.close')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DialogClose>
          </div>
          <DialogDescription className="xm-video-input__advanced-dialog-description">
            {labels.advancedDescription}
          </DialogDescription>
        </div>

        <div className="xm-video-input__advanced-shell">
          <div className="xm-video-input__advanced-section">
            <p className="xm-video-input__advanced-section-label">
              {labels.qualityPresetLabel}
            </p>
            <div
              className="xm-video-input__advanced-preset-grid"
              role="listbox"
              aria-label={labels.qualityPresetLabel}
            >
              {QUALITY_PRESET_SEQUENCE.map((preset) => {
                const isActive = preset === qualityPreset;

                return (
                  <button
                    key={preset}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      'xm-video-input__advanced-preset-btn',
                      isActive && 'is-active',
                    )}
                    onClick={() => applyPreset(preset)}
                  >
                    {presetLabelMap[preset]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xm-video-input__advanced-divider" />

          <div className="xm-video-input__advanced-grid">
            <div className="xm-video-input__advanced-field">
              <Label htmlFor="video-duration-minutes">{labels.durationLabel}</Label>
              <Input
                id="video-duration-minutes"
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                className="xm-video-input__advanced-input"
                aria-invalid={Boolean(errors.durationMinutes?.message)}
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
                inputMode="numeric"
                className="xm-video-input__advanced-input"
                aria-invalid={Boolean(errors.sectionCount?.message)}
                {...sectionCountField}
              />
              {errors.sectionCount?.message ? (
                <p id="video-input-section-count-error" className="text-xs text-destructive">
                  {errors.sectionCount.message}
                </p>
              ) : null}
            </div>

            <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
              <Label htmlFor="video-section-concurrency">{labels.concurrencyLabel}</Label>
              <Input
                id="video-section-concurrency"
                type="number"
                min={1}
                max={8}
                inputMode="numeric"
                className="xm-video-input__advanced-input"
                aria-invalid={Boolean(errors.sectionConcurrency?.message)}
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

            <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
              <span className="xm-video-input__advanced-label">
                {labels.renderQualityLabel}
              </span>
              <div
                className="xm-video-input__advanced-choice-grid xm-video-input__advanced-choice-grid--quality"
                role="group"
                aria-label={labels.renderQualityLabel}
              >
                {renderQualityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'xm-video-input__advanced-choice',
                      renderQuality === option.value && 'is-active',
                    )}
                    onClick={() => {
                      setValue('renderQuality', option.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                      clearErrors('renderQuality');
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
              <span className="xm-video-input__advanced-label">
                {labels.layoutHintLabel}
              </span>
              <div
                className="xm-video-input__advanced-choice-grid xm-video-input__advanced-choice-grid--layout"
                role="group"
                aria-label={labels.layoutHintLabel}
              >
                {layoutHintOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'xm-video-input__advanced-choice',
                      layoutHint === option.value && 'is-active',
                    )}
                    onClick={() => {
                      setValue('layoutHint', option.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                      clearErrors('layoutHint');
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xm-video-input__advanced-footer">
          <button
            type="button"
            className="xm-video-input__advanced-confirm"
            onClick={() => setIsAdvancedOpen(false)}
          >
            {labels.advancedDone}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
