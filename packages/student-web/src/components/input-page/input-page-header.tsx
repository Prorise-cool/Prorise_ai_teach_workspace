/**
 * 文件说明：输入页共享标题组件。
 * 承接视频输入页与课堂输入页共同的 Badge + 渐变标题结构。
 */
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** InputPageHeader 属性。 */
type InputPageHeaderProps = {
  /** Badge 左侧图标。 */
  badgeIcon: LucideIcon;
  /** Badge 文案。 */
  badgeLabel: string;
  /** 标题第一行（渐变前）。 */
  titleLine1: string;
  /** 标题渐变部分。 */
  titleGradient: string;
  /** 外层容器自定义类名。 */
  className?: string;
};

/**
 * 渲染输入页标题区：Badge + 渐变大标题。
 *
 * @param props - 标题参数。
 * @returns 标题区节点。
 */
export function InputPageHeader({
  badgeIcon: Icon,
  badgeLabel,
  titleLine1,
  titleGradient,
  className
}: InputPageHeaderProps) {
  return (
    <div className={cn('xm-input-header', className)}>
      <span className="xm-input-header__badge">
        <Icon className="h-3.5 w-3.5" />
        {badgeLabel}
      </span>
      <h1 className="xm-input-header__title">
        {titleLine1}
        <br className="md:hidden" />
        <span className="xm-input-header__gradient">{titleGradient}</span>
      </h1>
    </div>
  );
}
