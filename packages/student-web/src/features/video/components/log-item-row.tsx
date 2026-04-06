/**
 * 文件说明：视频等待页日志行组件。
 * 根据日志条目状态（success / warning / error / pending）渲染对应图标和样式。
 */
import { motion } from 'motion/react';
import { Check, CopySlash, Loader2, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

/** 日志条目类型。 */
export interface LogItem {
  id: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  text: string;
  tag?: string;
}

/**
 * 渲染单行日志条目。
 *
 * @param props - 日志条目属性。
 * @param props.item - 日志条目数据。
 * @returns 日志行 UI。
 */
export function LogItemRow({ item }: { item: LogItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        'flex items-start gap-3',
        item.status === 'success' && 'text-muted-foreground opacity-70',
        item.status === 'warning' && 'text-warning',
        item.status === 'error' && 'text-destructive',
        item.status === 'pending' && 'text-foreground font-medium',
      )}
    >
      {item.status === 'success' && <Check className="h-4 w-4 mt-0.5 font-bold text-success" />}
      {item.status === 'warning' && <TriangleAlert className="h-4 w-4 mt-0.5 font-bold text-warning" />}
      {item.status === 'error' && <CopySlash className="h-4 w-4 mt-0.5 font-bold text-destructive" />}
      {item.status === 'pending' && <Loader2 className="h-4 w-4 mt-0.5 text-primary animate-spin" />}

      <div className="flex-1">
        <span>{item.text}</span>
        {item.tag && (
          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded border border-current opacity-40">
            {item.tag}
          </span>
        )}
        {item.status === 'pending' && <span className="xm-generating-cursor-blink" />}
      </div>
    </motion.div>
  );
}
