/**
 * 文件说明：课堂输入卡片 — 高级参数弹窗。
 *
 * Fix：视觉直接复用视频侧 SCSS（`xm-video-input__advanced-*` 类名），通过导入
 * `features/video/styles/partials/_video-input-card.scss` 加载样式。
 * 幻灯片形式的课堂不需要"目标时长"（原 durationMinutes 字段已删除，因为
 * 用户用一页一页幻灯片形式授课和视频"分镜总时长"语义不同）。
 *
 * 字段：
 *   - sceneCount   1-30 默认 10（对应视频的 sectionCount）
 *   - interactiveMode  开启后走 OpenMAIC 的 interactive-outlines prompt 集
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

// 直接复用视频侧 advanced-dialog SCSS（class 名 xm-video-input__advanced-*）
import '@/features/video/styles/partials/_video-input-card.scss';

export type ClassroomInputAdvancedDialogLabels = {
  advancedTitle: string;
  advancedDescription: string;
  advancedDone: string;
  sceneCountLabel: string;
  sceneCountHint: string;
  interactiveLabel: string;
  interactiveHint: string;
  interactiveOn: string;
  interactiveOff: string;
};

export type ClassroomInputAdvancedDialogProps = {
  sceneCount: number;
  interactiveMode: boolean;
  onSceneCountChange: (value: number) => void;
  onInteractiveChange: (value: boolean) => void;
  onClose: () => void;
  labels: ClassroomInputAdvancedDialogLabels;
};

const SCENE_COUNT_MIN = 1;
const SCENE_COUNT_MAX = 30;

/**
 * 渲染课堂生成高级参数弹窗。视觉与视频侧 VideoInputAdvancedDialog 对齐。
 */
export const ClassroomInputAdvancedDialog: FC<ClassroomInputAdvancedDialogProps> = ({
  sceneCount,
  interactiveMode,
  onSceneCountChange,
  onInteractiveChange,
  onClose,
  labels,
}) => {
  const { t } = useAppTranslation();

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
        <div className="xm-video-input__advanced-grid">
          {/* 场景数量 */}
          <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
            <Label htmlFor="classroom-scene-count">{labels.sceneCountLabel}</Label>
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
              className="xm-video-input__advanced-input"
            />
            <p className="text-xs text-muted-foreground">{labels.sceneCountHint}</p>
          </div>

          {/* 互动模式 toggle */}
          <div className="xm-video-input__advanced-field xm-video-input__advanced-field--full">
            <span className="xm-video-input__advanced-label">
              {labels.interactiveLabel}
            </span>
            <div
              className="xm-video-input__advanced-choice-grid"
              role="group"
              aria-label={labels.interactiveLabel}
            >
              <button
                type="button"
                className={cn(
                  'xm-video-input__advanced-choice',
                  !interactiveMode && 'is-active',
                )}
                onClick={() => onInteractiveChange(false)}
              >
                {labels.interactiveOff}
              </button>
              <button
                type="button"
                className={cn(
                  'xm-video-input__advanced-choice',
                  interactiveMode && 'is-active',
                )}
                onClick={() => onInteractiveChange(true)}
              >
                {labels.interactiveOn}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{labels.interactiveHint}</p>
          </div>
        </div>
      </div>

      <div className="xm-video-input__advanced-footer">
        <button
          type="button"
          className="xm-video-input__advanced-confirm"
          onClick={onClose}
        >
          {labels.advancedDone}
        </button>
      </div>
    </DialogContent>
  );
};
