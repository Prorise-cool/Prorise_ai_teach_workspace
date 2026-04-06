/**
 * 文件说明：后续动作入口区（Story 4.8）。
 * Companion、Evidence、Learning Coach 在对应 Epic 未实现前展示 disabled 状态。
 */
import { BookOpen, GraduationCap, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FutureActionsBarProps {
  /** 额外 className。 */
  className?: string;
}

/** 后续功能入口定义。 */
const FUTURE_ACTIONS = [
  {
    key: 'companion',
    label: 'Companion 答疑',
    icon: MessageCircle,
    tooltip: '即将上线',
  },
  {
    key: 'evidence',
    label: '来源依据',
    icon: BookOpen,
    tooltip: '即将上线',
  },
  {
    key: 'learning-coach',
    label: '学后巩固',
    icon: GraduationCap,
    tooltip: '即将上线',
  },
] as const;

/**
 * 渲染后续动作入口区。
 * 按钮在对应 Epic 未实现前展示 disabled 状态。
 *
 * @param props - 入口区属性。
 * @returns 后续动作入口 UI。
 */
export function FutureActionsBar({ className }: FutureActionsBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {FUTURE_ACTIONS.map((action) => (
        <Button
          key={action.key}
          variant="outline"
          size="sm"
          disabled
          className="gap-1.5 opacity-50 cursor-not-allowed"
          title={action.tooltip}
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
