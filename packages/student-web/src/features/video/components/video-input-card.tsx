/**
 * 文件说明：视频输入页核心输入卡片组件。
 * 页面容器负责业务编排，本组件承接题目输入、图片上传、预设切换与高级参数调整。
 * Wave 1.5 polish：拆分出 video-input-media-preview / video-input-tool-buttons / video-input-advanced-dialog。
 */
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react';
import { type FieldErrors, type UseFormReturn } from 'react-hook-form';
import { ArrowRight, ChevronDown, Loader2, SlidersHorizontal } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  InputWorkspaceCardFrame,
} from '@/components/input-page/input-workspace-card-frame';
import { createInputWorkspaceCardClassNames } from '@/components/input-page/input-workspace-card-class-names';
import { useFileDropzone } from '@/components/input-page';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
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
  type VideoQualityPreset,
  type VideoRenderQuality,
} from '@/types/video';

import { VideoInputAdvancedDialog } from './video-input-advanced-dialog';
import { VideoInputMediaPreview } from './video-input-media-preview';
import { VideoInputToolButtons } from './video-input-tool-buttons';

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
  const renderQuality = watch('renderQuality');
  const layoutHint = watch('layoutHint');
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
              {inputType === 'image' ? (
                <VideoInputMediaPreview
                  imageFiles={imageFiles}
                  previewUrls={previewUrls}
                  onRemove={removeImage}
                  blockPrefix={classNames.root}
                  removeLabel={t('videoInput.removeImageLabel')}
                />
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
            <VideoInputToolButtons
              blockPrefix={classNames.root}
              fileInputRef={fileInputRef}
              onFileChange={originalHandleFileChange}
              acceptedMimeTypes={VIDEO_INPUT_ACCEPTED_IMAGE_TYPES}
              onTriggerSelect={triggerSelect}
              hasImage={imageFiles.length > 0}
              isRecording={isRecording}
              onToggleRecording={onToggleRecording}
              labels={{
                toolUploadImage: labels.toolUploadImage,
                toolVoiceInput: labels.toolVoiceInput,
                recordingLabel: labels.recordingLabel,
              }}
            />
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

      <VideoInputAdvancedDialog
        form={form}
        errors={errors}
        qualityPreset={qualityPreset}
        renderQuality={renderQuality}
        layoutHint={layoutHint}
        onApplyPreset={applyPreset}
        onClose={() => setIsAdvancedOpen(false)}
        labels={{
          advancedTitle: labels.advancedTitle,
          advancedDescription: labels.advancedDescription,
          advancedDone: labels.advancedDone,
          qualityPresetLabel: labels.qualityPresetLabel,
          durationLabel: labels.durationLabel,
          sectionCountLabel: labels.sectionCountLabel,
          concurrencyLabel: labels.concurrencyLabel,
          renderQualityLabel: labels.renderQualityLabel,
          layoutHintLabel: labels.layoutHintLabel,
          presetQuick: labels.presetQuick,
          presetBalanced: labels.presetBalanced,
          presetCinematic: labels.presetCinematic,
          renderQuickLabel: labels.renderQuickLabel,
          renderBalancedLabel: labels.renderBalancedLabel,
          renderHighLabel: labels.renderHighLabel,
          layoutCenterLabel: labels.layoutCenterLabel,
          layoutTwoColumnLabel: labels.layoutTwoColumnLabel,
        }}
      />
    </Dialog>
  );
}
