/**
 * 通用前端工具函数。
 * 当前仅保留 className 合并能力，供基础 UI 组件复用。
 */
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
