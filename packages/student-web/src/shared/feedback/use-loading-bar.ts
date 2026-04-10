/**
 * 文件说明：顶部进度条状态管理 hook。
 * 从 FeedbackProvider 中提取，负责加载条的显示、隐藏与防闪烁逻辑。
 */
import { useCallback, useRef, useState } from 'react';

const LOADING_BAR_DELAY_MS = 160;
const LOADING_BAR_MIN_VISIBLE_MS = 280;

let loadingBarSequence = 0;

function createLoadingBarId() {
  loadingBarSequence += 1;
  return `feedback-loading-bar-${loadingBarSequence}`;
}

export type UseLoadingBarReturn = {
  loadingBarVisible: boolean;
  showLoadingBar: () => string;
  hideLoadingBar: (id?: string) => void;
  clearLoadingBarTimers: () => void;
  resetLoadingBarState: () => void;
};

/**
 * 管理顶部加载条的状态，包含防闪烁延迟和最短显示时长。
 *
 * @returns 加载条控制方法与可见状态。
 */
export function useLoadingBar(): UseLoadingBarReturn {
  const [loadingBarVisible, setLoadingBarVisible] = useState(false);
  const loadingBarDelayTimerRef = useRef<number | null>(null);
  const loadingBarHideTimerRef = useRef<number | null>(null);
  const loadingBarVisibleAtRef = useRef<number | null>(null);
  const loadingBarIdsRef = useRef(new Set<string>());

  /**
   * 清理顶部进度条相关定时器，避免展示状态残留。
   */
  const clearLoadingBarTimers = useCallback(() => {
    if (loadingBarDelayTimerRef.current !== null) {
      window.clearTimeout(loadingBarDelayTimerRef.current);
      loadingBarDelayTimerRef.current = null;
    }

    if (loadingBarHideTimerRef.current !== null) {
      window.clearTimeout(loadingBarHideTimerRef.current);
      loadingBarHideTimerRef.current = null;
    }
  }, []);

  /**
   * 在不闪烁的前提下隐藏顶部加载条。
   */
  const scheduleLoadingBarHide = useCallback(() => {
    if (loadingBarIdsRef.current.size > 0) {
      return;
    }

    if (loadingBarDelayTimerRef.current !== null) {
      window.clearTimeout(loadingBarDelayTimerRef.current);
      loadingBarDelayTimerRef.current = null;
    }

    if (!loadingBarVisible) {
      return;
    }

    if (loadingBarHideTimerRef.current !== null) {
      window.clearTimeout(loadingBarHideTimerRef.current);
      loadingBarHideTimerRef.current = null;
    }

    const elapsed =
      loadingBarVisibleAtRef.current === null
        ? LOADING_BAR_MIN_VISIBLE_MS
        : Date.now() - loadingBarVisibleAtRef.current;
    const remaining = Math.max(LOADING_BAR_MIN_VISIBLE_MS - elapsed, 0);

    if (remaining === 0) {
      loadingBarVisibleAtRef.current = null;
      setLoadingBarVisible(false);
      return;
    }

    loadingBarHideTimerRef.current = window.setTimeout(() => {
      loadingBarHideTimerRef.current = null;

      if (loadingBarIdsRef.current.size > 0) {
        return;
      }

      loadingBarVisibleAtRef.current = null;
      setLoadingBarVisible(false);
    }, remaining);
  }, [loadingBarVisible]);

  /**
   * 显示带最小时长保护的顶部进度条，避免瞬时加载闪烁。
   *
   * @returns 当前加载条句柄，供调用方在完成后关闭。
   */
  const showLoadingBar = useCallback(() => {
    const loadingBarId = createLoadingBarId();

    loadingBarIdsRef.current.add(loadingBarId);

    if (loadingBarHideTimerRef.current !== null) {
      window.clearTimeout(loadingBarHideTimerRef.current);
      loadingBarHideTimerRef.current = null;
    }

    if (loadingBarVisible || loadingBarDelayTimerRef.current !== null) {
      return loadingBarId;
    }

    loadingBarDelayTimerRef.current = window.setTimeout(() => {
      loadingBarDelayTimerRef.current = null;

      if (loadingBarIdsRef.current.size === 0) {
        return;
      }

      loadingBarVisibleAtRef.current = Date.now();
      setLoadingBarVisible(true);
    }, LOADING_BAR_DELAY_MS);

    return loadingBarId;
  }, [loadingBarVisible]);

  /**
   * 关闭顶部进度条；若未传句柄则强制清空所有挂起加载。
   *
   * @param id - 可选加载句柄。
   */
  const hideLoadingBar = useCallback(
    (id?: string) => {
      if (typeof id === 'string') {
        loadingBarIdsRef.current.delete(id);
      } else {
        loadingBarIdsRef.current.clear();
      }

      scheduleLoadingBarHide();
    },
    [scheduleLoadingBarHide]
  );

  /**
   * 重置加载条全部状态，供 Provider cleanup 使用。
   */
  const resetLoadingBarState = useCallback(() => {
    clearLoadingBarTimers();
    loadingBarIdsRef.current.clear();
    loadingBarVisibleAtRef.current = null;
    setLoadingBarVisible(false);
  }, [clearLoadingBarTimers]);

  return {
    loadingBarVisible,
    showLoadingBar,
    hideLoadingBar,
    clearLoadingBarTimers,
    resetLoadingBarState
  };
}
