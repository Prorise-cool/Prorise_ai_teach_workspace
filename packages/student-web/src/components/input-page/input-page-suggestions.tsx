/**
 * 文件说明：输入页共享建议标签组件。
 * 承接视频输入页与课堂输入页 "Try These" 标签行的统一结构。
 */
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

/** InputPageSuggestions 属性。 */
type InputPageSuggestionsProps = {
  /** 标签前缀文案，如 "Try These"。 */
  label: string;
  /** 建议标签列表。 */
  pills: string[];
  /** 点击建议标签时的回调。 */
  onSelect?: (pill: string) => void;
  /** 外层容器自定义类名。 */
  className?: string;
};

/**
 * 渲染建议标签行：标签前缀 + 可点击 pill 按钮。
 *
 * @param props - 建议标签参数。
 * @returns 建议标签节点。
 */
export function InputPageSuggestions({
  label,
  pills,
  onSelect,
  className
}: InputPageSuggestionsProps) {
  return (
    <div className={cn('xm-input-suggestions', className)}>
      <span className="xm-input-suggestions__label">{label}</span>
      {pills.map((pill) => (
        <button
          key={pill}
          type="button"
          className="xm-input-suggestions__pill"
          onClick={() => onSelect?.(pill)}
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--xm-color-brand-500)]" />
          {pill}
        </button>
      ))}
    </div>
  );
}
