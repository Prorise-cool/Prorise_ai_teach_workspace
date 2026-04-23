/**
 * 文件说明：视频输入卡片 — 高级参数弹窗（从 video-input-card 拆分，wave-1.5 polish）。
 * 覆盖 quality preset + duration/sectionCount/sectionConcurrency + renderQuality + layoutHint 配置。
 */
import { SlidersHorizontal, X } from 'lucide-react';
import type { FC } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { VideoInputFormValues } from '@/features/video/schemas/video-input-schema';
import type { VideoLayoutHint, VideoQualityPreset, VideoRenderQuality } from '@/types/video';

const QUALITY_PRESET_SEQUENCE: readonly VideoQualityPreset[] = [
  'fast',
  'balanced',
  'cinematic',
];

export type VideoInputAdvancedDialogLabels = {
  advancedTitle: string;
  advancedDescription: string;
  advancedDone: string;
  qualityPresetLabel: string;
  durationLabel: string;
  sectionCountLabel: string;
  concurrencyLabel: string;
  renderQualityLabel: string;
  layoutHintLabel: string;
  presetQuick: string;
  presetBalanced: string;
  presetCinematic: string;
  renderQuickLabel: string;
  renderBalancedLabel: string;
  renderHighLabel: string;
  layoutCenterLabel: string;
  layoutTwoColumnLabel: string;
};

type VideoInputAdvancedDialogProps = {
  form: UseFormReturn<VideoInputFormValues>;
  errors: FieldErrors<VideoInputFormValues>;
  qualityPreset: VideoQualityPreset;
  renderQuality: VideoRenderQuality;
  layoutHint: VideoLayoutHint;
  onApplyPreset: (preset: VideoQualityPreset) => void;
  onClose: () => void;
  labels: VideoInputAdvancedDialogLabels;
};

export const VideoInputAdvancedDialog: FC<VideoInputAdvancedDialogProps> = ({
  form,
  errors,
  qualityPreset,
  renderQuality,
  layoutHint,
  onApplyPreset,
  onClose,
  labels,
}) => {
  const { t } = useAppTranslation();
  const { register, setValue, clearErrors } = form;
  const durationField = register('durationMinutes', { valueAsNumber: true });
  const sectionCountField = register('sectionCount', { valueAsNumber: true });
  const sectionConcurrencyField = register('sectionConcurrency', { valueAsNumber: true });

  const presetLabelMap: Record<VideoQualityPreset, string> = {
    fast: labels.presetQuick,
    balanced: labels.presetBalanced,
    cinematic: labels.presetCinematic,
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

  return (
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
          <p className="xm-video-input__advanced-section-label">{labels.qualityPresetLabel}</p>
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
                  onClick={() => onApplyPreset(preset)}
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
            <span className="xm-video-input__advanced-label">{labels.renderQualityLabel}</span>
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
            <span className="xm-video-input__advanced-label">{labels.layoutHintLabel}</span>
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
        <button type="button" className="xm-video-input__advanced-confirm" onClick={onClose}>
          {labels.advancedDone}
        </button>
      </div>
    </DialogContent>
  );
};
