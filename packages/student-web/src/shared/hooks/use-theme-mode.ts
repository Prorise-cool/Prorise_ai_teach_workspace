/**
 * 文件说明：提供 student-web 全局亮暗色主题状态。
 * 负责统一读取与写入 `data-theme` 和本地缓存，供首页、落地页和导航复用。
 */
import { useCallback, useEffect, useState } from 'react';

import { THEME_STORAGE_KEY } from '@/shared/constants';

export type ThemeMode = 'light' | 'dark';

const THEME_MODE_SYNC_EVENT = 'xiaomai-theme-mode-sync';

/**
 * 判断值是否为受支持的主题模式。
 *
 * @param value - 待判断的值。
 * @returns 是否为 `ThemeMode`。
 */
function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/**
 * 解析初始主题模式，优先读取本地缓存，其次回退到文档当前主题。
 *
 * @returns 初始亮暗色模式。
 */
function readThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * 持久化主题模式，并向同页其他消费者广播同步事件。
 *
 * @param themeMode - 待写入的主题模式。
 */
function persistThemeMode(themeMode: ThemeMode) {
  document.documentElement.dataset.theme = themeMode;
  document.documentElement.style.colorScheme = themeMode;
  document.documentElement.classList.toggle('dark', themeMode === 'dark');
  document.documentElement.classList.toggle('light', themeMode !== 'dark');
  window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  window.dispatchEvent(
    new CustomEvent<ThemeMode>(THEME_MODE_SYNC_EVENT, {
      detail: themeMode
    })
  );
}

/**
 * 管理全局主题模式，并同步到 `document.documentElement`。
 *
 * @returns 当前主题模式与切换方法。
 */
export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemeMode);

  useEffect(() => {
    persistThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    function syncThemeMode(event: Event) {
      if (event instanceof CustomEvent) {
        const syncedThemeMode = event.detail;

        if (isThemeMode(syncedThemeMode)) {
          setThemeMode(currentTheme =>
            currentTheme === syncedThemeMode
              ? currentTheme
              : syncedThemeMode
          );
          return;
        }
      }

      const nextThemeMode = readThemeMode();

      setThemeMode(currentTheme =>
        currentTheme === nextThemeMode ? currentTheme : nextThemeMode
      );
    }

    window.addEventListener(
      THEME_MODE_SYNC_EVENT,
      syncThemeMode as EventListener
    );
    window.addEventListener('storage', syncThemeMode);

    return () => {
      window.removeEventListener(
        THEME_MODE_SYNC_EVENT,
        syncThemeMode as EventListener
      );
      window.removeEventListener('storage', syncThemeMode);
    };
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode(currentTheme =>
      currentTheme === 'dark' ? 'light' : 'dark'
    );
  }, []);

  return {
    themeMode,
    toggleThemeMode
  };
}
