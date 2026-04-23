/**
 * OpenMAIC 设置 Zustand Store。
 * 管理提供商偏好、语言设置等，持久化到 localStorage。
 */
import { create } from 'zustand';

const STORAGE_KEY = 'openmaic-settings';

export interface OpenMAICSettings {
  preferredProvider: string;
  enableWebSearch: boolean;
  enableInteractiveMode: boolean;
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'system';
  speechRate: number; // 0.5 - 2.0
  autoAdvanceScenes: boolean;
}

export interface SettingsStoreActions {
  updateSettings: (partial: Partial<OpenMAICSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: OpenMAICSettings = {
  preferredProvider: 'default',
  enableWebSearch: false,
  enableInteractiveMode: false,
  language: 'zh-CN',
  theme: 'system',
  speechRate: 1.0,
  autoAdvanceScenes: false,
};

function readPersistedSettings(): OpenMAICSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<OpenMAICSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: OpenMAICSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 忽略存储异常
  }
}

export const useOpenMAICSettingsStore = create<OpenMAICSettings & SettingsStoreActions>()((set) => ({
  ...readPersistedSettings(),

  updateSettings: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      persistSettings(next);
      return next;
    });
  },

  resetSettings: () => {
    persistSettings(DEFAULT_SETTINGS);
    set(DEFAULT_SETTINGS);
  },
}));
