/**
 * 文件说明：Companion 侧栏收展状态管理 hook。
 * 提供开/关状态与切换函数。
 */
import { useCallback, useState } from 'react';

/** useSidebarToggle 返回值。 */
export interface SidebarToggleState {
  /** 侧栏是否展开。 */
  isOpen: boolean;
  /** 切换侧栏收展状态。 */
  toggle: () => void;
}

/**
 * 管理 Companion 侧栏的收展状态。
 *
 * @param defaultOpen - 初始是否展开，默认 true。
 * @returns 侧栏状态与切换函数。
 */
export function useSidebarToggle(defaultOpen = true): SidebarToggleState {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, toggle };
}
