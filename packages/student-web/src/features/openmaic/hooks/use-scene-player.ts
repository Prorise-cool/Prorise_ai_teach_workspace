/**
 * 场景播放器 Hook。
 * 管理场景顺序推进和播放状态机。
 */
import { useCallback } from 'react';

import { useClassroomStore, useSceneList } from '../store/classroom-store';
import type { Scene, PlaybackStatus } from '../types/scene';

export interface UseScenePlayerReturn {
  currentScene: Scene | null;
  scenes: Scene[];
  playbackStatus: PlaybackStatus;
  currentIndex: number;
  totalScenes: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  goToScene: (sceneId: string) => void;
  goToIndex: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  play: () => void;
  pause: () => void;
  goLive: () => void;
}

export function useScenePlayer(): UseScenePlayerReturn {
  const store = useClassroomStore;
  const currentSceneId = useClassroomStore((s) => s.currentSceneId);
  const playbackStatus = useClassroomStore((s) => s.playbackStatus);
  const scenes = useSceneList();

  const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
  const currentScene = currentIndex >= 0 ? scenes[currentIndex] : null;

  const goToScene = useCallback(
    (sceneId: string) => {
      store.getState().setCurrentScene(sceneId);
      store.getState().setPlaybackStatus('playing');
    },
    [store],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < scenes.length) {
        goToScene(scenes[index].id);
      }
    },
    [scenes, goToScene],
  );

  const goNext = useCallback(() => {
    if (currentIndex < scenes.length - 1) {
      goToIndex(currentIndex + 1);
    } else {
      store.getState().setPlaybackStatus('completed');
    }
  }, [currentIndex, scenes.length, goToIndex, store]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  }, [currentIndex, goToIndex]);

  const play = useCallback(() => {
    store.getState().setPlaybackStatus('playing');
    // 如果没有当前场景，从第一个开始
    if (!currentSceneId && scenes.length > 0) {
      store.getState().setCurrentScene(scenes[0].id);
    }
  }, [store, currentSceneId, scenes]);

  const pause = useCallback(() => {
    store.getState().setPlaybackStatus('paused');
  }, [store]);

  const goLive = useCallback(() => {
    store.getState().setPlaybackStatus('live');
  }, [store]);

  return {
    currentScene,
    scenes,
    playbackStatus,
    currentIndex,
    totalScenes: scenes.length,
    canGoNext: currentIndex < scenes.length - 1,
    canGoPrev: currentIndex > 0,
    goToScene,
    goToIndex,
    goNext,
    goPrev,
    play,
    pause,
    goLive,
  };
}
