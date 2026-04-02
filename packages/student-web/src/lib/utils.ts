/**
 * 文件说明：存放前端共享的小型工具函数。
 * 当前仅保留 className 合并能力，供 Tailwind 与业务组件统一复用。
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 `clsx` 与 `tailwind-merge`，生成去冲突后的 className 字符串。
 *
 * @param inputs - 需要合并的 className 片段。
 * @returns 合并后的 className。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
