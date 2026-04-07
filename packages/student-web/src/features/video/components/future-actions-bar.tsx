/**
 * 文件说明：后续动作入口区（Story 4.8）。
 * Companion、Evidence、Learning Coach 在对应 Epic 未实现前展示 disabled 状态。
 */
import type { LucideIcon } from 'lucide-react';
import { BookOpen, GraduationCap, MessageCircle } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FutureActionsBarProps {
  /** 额外 className。 */
  className?: string;
}

/** 后续功能入口定义（i18n key + icon）。 */
const FUTURE_ACTIONS: ReadonlyArray<{
  key: string;
  labelKey: string;
  icon: LucideIcon;
}> = [
  {
    key: 'companion',
    labelKey: 'video.futureActions.companion',
    icon: MessageCircle,
  },
  {
    key: 'evidence',
    labelKey: 'video.futureActions.evidence',
    icon: BookOpen,
  },
  {
    key: 'learning-coach',
    labelKey: 'video.futureActions.learningCoach',
    icon: GraduationCap,
  },
];

/**
 * 渲染后续动作入口区。
 * 按钮在对应 Epic 未实现前展示 disabled 状态。
 *
 * @param props - 入口区属性。
 * @returns 后续动作入口 UI。
 */
export function FutureActionsBar({ className }: FutureActionsBarProps) {
  const { t } = useAppTranslation();

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {FUTURE_ACTIONS.map((action) => (
        <Button
          key={action.key}
          variant="outline"
          size="sm"
          disabled
          className="gap-1.5 opacity-50 cursor-not-allowed"
          title={t('video.futureActions.comingSoon')}
        >
          <action.icon className="w-3.5 h-3.5" />
          {t(action.labelKey)}
        </Button>
      ))}
    </div>
  );
}
