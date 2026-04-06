/**
 * 文件说明：视频结果页通用错误视图组件。
 * 支持自定义图标、标题、消息和操作按钮，适用于权限拒绝、视频缺失、加载失败等场景。
 */
import type { LucideIcon } from 'lucide-react';

/**
 * 渲染结果页通用错误/空状态视图。
 *
 * @param props - 错误视图属性。
 * @param props.icon - Lucide 图标组件。
 * @param props.title - 错误标题。
 * @param props.message - 错误描述。
 * @param props.action - 操作按钮（可选）。
 * @returns 错误视图 UI。
 */
export function ResultErrorView({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-20">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {action}
    </div>
  );
}
