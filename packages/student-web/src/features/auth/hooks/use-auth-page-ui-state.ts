/**
 * 文件说明：封装认证页的主题偏好和插画交互状态。
 * 这样页面容器只保留认证编排相关逻辑，避免业务状态和页面 UI 状态混杂。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AuthInteractionZone,
  AuthScenePhase
} from '@/features/auth/components/auth-scene';
import { AUTH_THEME_STORAGE_KEY } from '@/features/auth/shared/auth-content';

type AuthThemeMode = 'light' | 'dark';

/**
 * 解析认证页初始主题模式，优先读取本地缓存，其次回退到文档主题。
 *
 * @returns 初始主题模式。
 */
function getInitialThemeMode(): AuthThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(AUTH_THEME_STORAGE_KEY);

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * 根据表单焦点与空闲状态推导插画场景阶段。
 *
 * @param focusZone - 当前输入焦点映射到的交互区域。
 * @param isSleeping - 是否处于休眠状态。
 * @param isWakingUp - 是否处于唤醒过渡状态。
 * @returns 供插画组件消费的场景阶段。
 */
function resolveScenePhase(
  focusZone: AuthInteractionZone,
  isSleeping: boolean,
  isWakingUp: boolean
): AuthScenePhase {
  if (focusZone === 'sensitive') {
    return 'hidden';
  }

  if (focusZone === 'account') {
    return 'peeking';
  }

  if (isWakingUp) {
    return 'wake-up';
  }

  if (isSleeping) {
    return 'sleep';
  }

  return 'idle';
}

/**
 * 管理认证页的主题切换与插画交互状态。
 *
 * @returns 认证页 UI 状态与交互方法集合。
 */
export function useAuthPageUiState() {
  const [themeMode, setThemeMode] = useState<AuthThemeMode>(getInitialThemeMode);

  // 插画交互状态。
  const [focusZone, setFocusZone] = useState<AuthInteractionZone>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  const wakeTimeoutRef = useRef<number | null>(null);

  const toggleThemeMode = useCallback(() => {
    setThemeMode(currentTheme =>
      currentTheme === 'dark' ? 'light' : 'dark'
    );
  }, []);

  const handleSceneZoneChange = useCallback((zone: AuthInteractionZone) => {
    setFocusZone(zone);

    if (zone) {
      setIsSleeping(false);
      setIsWakingUp(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem(AUTH_THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (wakeTimeoutRef.current) {
      window.clearTimeout(wakeTimeoutRef.current);
    }

    if (focusZone) {
      return undefined;
    }

    let idleTimeoutId = window.setTimeout(() => {
      setIsSleeping(true);
    }, 5000);

    const handleActivity = () => {
      if (isSleeping) {
        setIsSleeping(false);
        setIsWakingUp(true);

        wakeTimeoutRef.current = window.setTimeout(() => {
          setIsWakingUp(false);
        }, 450);
      }

      window.clearTimeout(idleTimeoutId);
      idleTimeoutId = window.setTimeout(() => {
        setIsSleeping(true);
      }, 5000);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart'
    ];

    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity);
    });

    return () => {
      window.clearTimeout(idleTimeoutId);

      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [focusZone, isSleeping]);

  useEffect(() => {
    return () => {
      if (wakeTimeoutRef.current) {
        window.clearTimeout(wakeTimeoutRef.current);
      }
    };
  }, []);

  const scenePhase = useMemo(
    () => resolveScenePhase(focusZone, isSleeping, isWakingUp),
    [focusZone, isSleeping, isWakingUp]
  );

  return {
    themeMode,
    scenePhase,
    toggleThemeMode,
    handleSceneZoneChange
  };
}
