/**
 * 文件说明：提供 student-web 全局亮暗色主题状态。
 * 负责统一读取与写入 `data-theme` 和本地缓存，供首页、落地页和导航复用。
 */
import { useCallback, useEffect, useState } from 'react';

import { THEME_STORAGE_KEY } from '@/shared/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_SYNC_EVENT = 'xiaomai-theme-mode-sync';

/**
 * 判断值是否为受支持的主题模式。
 *
 * @param value - 待判断的值。
 * @returns 是否为 `ThemeMode`。
 */
function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
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

function resolveSystemTheme(): Exclude<ThemeMode, 'system'> {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 持久化主题模式，并向同页其他消费者广播同步事件。
 *
 * @param themeMode - 待写入的主题模式。
 */
function persistThemeMode(themeMode: ThemeMode) {
  const resolvedThemeMode = themeMode === 'system' ? resolveSystemTheme() : themeMode;

  document.documentElement.dataset.theme = resolvedThemeMode;
  document.documentElement.style.colorScheme = resolvedThemeMode;
  document.documentElement.classList.toggle('dark', resolvedThemeMode === 'dark');
  document.documentElement.classList.toggle('light', resolvedThemeMode !== 'dark');
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>(readThemeMode);

  useEffect(() => {
    persistThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    function syncThemeMode(event: Event) {
      if (event instanceof CustomEvent) {
        const syncedThemeMode = event.detail;

        if (isThemeMode(syncedThemeMode)) {
          setThemeModeState(currentTheme =>
            currentTheme === syncedThemeMode
              ? currentTheme
              : syncedThemeMode
          );
          return;
        }
      }

      const nextThemeMode = readThemeMode();

      setThemeModeState(currentTheme =>
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (themeMode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

    if (!mediaQuery) {
      return;
    }

    const handleChange = () => {
      persistThemeMode('system');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  const setThemeMode = useCallback((nextThemeMode: ThemeMode) => {
    setThemeModeState(nextThemeMode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  return {
    themeMode,
    setThemeMode,
    toggleThemeMode
  };
}
