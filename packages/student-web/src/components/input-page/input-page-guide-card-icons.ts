/**
 * 文件说明：输入页共享引导卡片图标常量。
 * 供课堂输入页与视频输入页把文案映射为统一的图标序列。
 */
import {
  PackageSearch,
  ShieldAlert,
  type LucideIcon,
  WifiOff,
} from 'lucide-react';

/** 输入页底部三张引导卡片的默认图标顺序。 */
export const INPUT_PAGE_GUIDE_CARD_ICONS = [
  PackageSearch,
  ShieldAlert,
  WifiOff,
] as const satisfies readonly LucideIcon[];
