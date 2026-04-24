/**
 * 文件说明：课堂输入卡片 — 高级参数弹窗。
 *
 * Phase 1：提供 sceneCount / durationMinutes / interactiveMode 三个字段，模式对齐
 * `features/video/components/video-input-advanced-dialog.tsx`（视频侧 quality preset 模式）。
 * Phase 5 会真正消费 `interactiveMode` 字段切换 prompt 集。
 */
import { SlidersHorizontal, X } from 'lucide-react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const CLASSROOM_DURATION_PRESETS: readonly number[] = [5, 15, 30, 60];

export type ClassroomInputAdvancedDialogLabels = {
  advancedTitle: string;
  advancedDescription: string;
  advancedDone: string;
  sceneCountLabel: string;
  sceneCountHint: string;
  durationLabel: string;
  durationUnit: string;
  interactiveLabel: string;
  interactiveHint: string;
  interactiveOn: string;
  interactiveOff: string;
};

export type ClassroomInputAdvancedDialogProps = {
  sceneCount: number;
  durationMinutes: number;
  interactiveMode: boolean;
  onSceneCountChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onInteractiveChange: (value: boolean) => void;
  onClose: () => void;
  labels: ClassroomInputAdvancedDialogLabels;
};

const SCENE_COUNT_MIN = 1;
const SCENE_COUNT_MAX = 30;

/**
 * 渲染课堂生成高级参数弹窗。
 */
export const ClassroomInputAdvancedDialog: FC<ClassroomInputAdvancedDialogProps> = ({
  sceneCount,
  durationMinutes,
  interactiveMode,
  onSceneCountChange,
  onDurationChange,
  onInteractiveChange,
  onClose,
  labels,
}) => {
  const { t } = useAppTranslation();

  return (
    <DialogContent className="left-1/2 top-1/2 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background p-0 shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <DialogTitle className="text-base font-semibold">{labels.advancedTitle}</DialogTitle>
        </div>
        <DialogClose asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={t('common.close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </DialogClose>
      </div>

      <DialogDescription className="px-5 pt-3 text-xs text-muted-foreground">
        {labels.advancedDescription}
      </DialogDescription>

      <div className="flex flex-col gap-5 px-5 pb-5 pt-4">
        {/* 场景数量 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="classroom-scene-count" className="text-sm font-medium">
            {labels.sceneCountLabel}
          </Label>
          <Input
            id="classroom-scene-count"
            type="number"
            inputMode="numeric"
            min={SCENE_COUNT_MIN}
            max={SCENE_COUNT_MAX}
            value={sceneCount}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (Number.isNaN(raw)) return;
              const clamped = Math.min(
                Math.max(Math.round(raw), SCENE_COUNT_MIN),
                SCENE_COUNT_MAX,
              );
              onSceneCountChange(clamped);
            }}
            className="max-w-[8rem]"
          />
          <p className="text-xs text-muted-foreground">{labels.sceneCountHint}</p>
        </div>

        {/* 时长预设 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{labels.durationLabel}</span>
          <div
            className="grid grid-cols-4 gap-2"
            role="group"
            aria-label={labels.durationLabel}
          >
            {CLASSROOM_DURATION_PRESETS.map((preset) => {
              const isActive = preset === durationMinutes;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onDurationChange(preset)}
                  className={cn(
                    'flex items-center justify-center rounded-lg border px-2 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:bg-muted',
                  )}
                >
                  {preset}
                  {labels.durationUnit}
                </button>
              );
            })}
          </div>
        </div>

        {/* 互动模式 toggle */}
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{labels.interactiveLabel}</span>
            <span className="text-xs text-muted-foreground">{labels.interactiveHint}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={interactiveMode}
            onClick={() => onInteractiveChange(!interactiveMode)}
            className={cn(
              'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
              interactiveMode ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform',
                interactiveMode ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
            <span className="sr-only">
              {interactiveMode ? labels.interactiveOn : labels.interactiveOff}
            </span>
          </button>
        </div>
      </div>

      <div className="flex justify-end border-t border-border/60 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {labels.advancedDone}
        </button>
      </div>
    </DialogContent>
  );
};
