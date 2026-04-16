/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件承接题目输入、图片上传、预设切换与高级参数调整。
 */
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { type FieldErrors, type UseFormReturn } from 'react-hook-form';
import {
  Check,
  Image,
  Loader2,
  Mic,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [isPresetOpen, setIsPresetOpen] = useState(false);
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

  const layoutHintLabelMap: Record<VideoLayoutHint, string> = {
    center_stage: labels.layoutCenterLabel,
    two_column: labels.layoutTwoColumnLabel,
  };

  const presetMetaMap = useMemo(() => {
    const buildMeta = (preset: VideoQualityPreset) => {
      const defaults = VIDEO_QUALITY_PRESET_DEFAULTS[preset];

      return [
        `${defaults.durationMinutes} ${labels.durationUnit}`,
        `${defaults.sectionCount} ${labels.sectionUnit}`,
        `${labels.concurrencyShortLabel} ${defaults.sectionConcurrency}`,
      ].join(' · ');
    };

    return {
      fast: buildMeta('fast'),
      balanced: buildMeta('balanced'),
      cinematic: buildMeta('cinematic'),
    } satisfies Record<VideoQualityPreset, string>;
  }, [
    labels.concurrencyShortLabel,
    labels.durationUnit,
    labels.sectionUnit,
  ]);

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

  return (
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

          <div className={`${classNames.root}-config-strip`} aria-live="polite">
            <span className={cn(`${classNames.root}-config-chip`, `${classNames.root}-config-chip--accent`)}>
              {presetLabelMap[qualityPreset]}
            </span>
            <span className={`${classNames.root}-config-chip`}>
              {durationMinutes} {labels.durationUnit}
            </span>
            <span className={`${classNames.root}-config-chip`}>
              {sectionCount} {labels.sectionUnit}
            </span>
            <span className={`${classNames.root}-config-chip`}>
              {labels.concurrencyShortLabel} {sectionConcurrency}
            </span>
            <span className={`${classNames.root}-config-chip`}>
              {renderQualityLabelMap[renderQuality]}
            </span>
            <span className={`${classNames.root}-config-chip`}>
              {layoutHintLabelMap[layoutHint]}
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

          <div className={`${classNames.root}-divider`} />

          <Popover open={isPresetOpen} onOpenChange={setIsPresetOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  `${toolButtonClassName} relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]`,
                  isPresetOpen && 'is-active',
                )}
                title={labels.qualityPresetLabel}
                aria-label={labels.qualityPresetLabel}
              >
                <Sparkles className="h-4 w-4" />
                <span className={`${classNames.root}-tool-indicator`} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="xm-video-input__preset-popover"
            >
              <div className="xm-video-input__preset-popover-head">
                <p className="xm-video-input__preset-popover-title">
                  {labels.qualityPresetLabel}
                </p>
                <p className="xm-video-input__preset-popover-desc">
                  {labels.qualityPresetHint}
                </p>
              </div>
              <div
                className="xm-video-input__preset-options"
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
                        'xm-video-input__preset-option',
                        isActive && 'is-active',
                      )}
                      onClick={() => {
                        applyPreset(preset);
                        setIsPresetOpen(false);
                      }}
                    >
                      <div className="xm-video-input__preset-option-copy">
                        <span className="xm-video-input__preset-option-title">
                          {presetLabelMap[preset]}
                        </span>
                        <span className="xm-video-input__preset-option-meta">
                          {presetMetaMap[preset]}
                        </span>
                      </div>
                      <span className="xm-video-input__preset-option-indicator">
                        {isActive ? <Check className="h-4 w-4" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={cn(
                  `${toolButtonClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xm-focus-ring)]`,
                  isAdvancedOpen && 'is-active',
                )}
                title={labels.advancedSettingsLabel}
                aria-label={labels.advancedSettingsLabel}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="xm-video-input__advanced-dialog">
              <div className="xm-video-input__advanced-shell">
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
                      inputMode="numeric"
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
                      aria-invalid={Boolean(errors.sectionCount?.message)}
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
                      inputMode="numeric"
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
                      className="xm-video-input__advanced-choice-grid"
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
                      className="xm-video-input__advanced-choice-grid"
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

                <div className="xm-video-input__advanced-actions">
                  <Button
                    type="button"
                    variant="surface"
                    size="sm"
                    onClick={() => applyPreset(qualityPreset)}
                  >
                    {labels.advancedReset}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAdvancedOpen(false)}
                  >
                    {labels.advancedDone}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
              <span>{t('videoInput.submittingLabel')}</span>
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
