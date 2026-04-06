/**
 * 文件说明：Tips 轮播 hook。
 * 按固定间隔循环切换提示文案索引，用于等待页底部 Tips 展示。
 */
import { useEffect, useState } from 'react';

/** Tips 轮播间隔（毫秒）。 */
const TIP_ROTATION_INTERVAL_MS = 6000;

/**
 * 按固定间隔循环递增索引，用于 Tips 轮播。
 *
 * @param total - 提示条目总数。
 * @returns 当前显示索引。
 */
export function useTipRotation(total: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (total <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, TIP_ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [total]);

  return index;
}
