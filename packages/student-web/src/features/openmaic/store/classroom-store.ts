/**
 * 课堂状态 Zustand Store。
 * 管理当前激活的课堂、场景列表、当前场景和播放状态。
 */
import { create } from 'zustand';

import type { Classroom } from '../types/classroom';
import type { Scene, PlaybackStatus } from '../types/scene';
import type { AgentProfile } from '../types/agent';

export interface ClassroomStoreState {
  // 当前课堂
  classroom: Classroom | null;
  // 当前展示场景
  currentSceneId: string | null;
  // 播放状态
  playbackStatus: PlaybackStatus;
  // 智能体列表（生成后填充）
  agents: AgentProfile[];
  // 课堂生成进度（0-100）
  generationProgress: number;
  // 生成中的消息提示
  generationMessage: string;
  // 白板是否打开
  whiteboardOpen: boolean;
}

export interface ClassroomStoreActions {
  setClassroom: (classroom: Classroom) => void;
  updateScenes: (scenes: Scene[]) => void;
  setCurrentScene: (sceneId: string | null) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setAgents: (agents: AgentProfile[]) => void;
  setGenerationProgress: (progress: number, message?: string) => void;
  setWhiteboardOpen: (open: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ClassroomStoreState = {
  classroom: null,
  currentSceneId: null,
  playbackStatus: 'idle',
  agents: [],
  generationProgress: 0,
  generationMessage: '',
  whiteboardOpen: false,
};

export const useClassroomStore = create<ClassroomStoreState & ClassroomStoreActions>()((set) => ({
  ...INITIAL_STATE,

  setClassroom: (classroom) => set({ classroom }),

  updateScenes: (scenes) =>
    set((state) => ({
      classroom: state.classroom
        ? { ...state.classroom, scenes }
        : null,
    })),

  setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

  setPlaybackStatus: (status) => set({ playbackStatus: status }),

  setAgents: (agents) => set({ agents }),

  setGenerationProgress: (progress, message) =>
    set({ generationProgress: progress, generationMessage: message ?? '' }),

  setWhiteboardOpen: (open) => set({ whiteboardOpen: open }),

  reset: () => set(INITIAL_STATE),
}));

/** 便捷 selector：当前场景 */
export function useCurrentScene(): Scene | null {
  return useClassroomStore((state) => {
    if (!state.classroom || !state.currentSceneId) return null;
    return state.classroom.scenes.find((s) => s.id === state.currentSceneId) ?? null;
  });
}

/** 便捷 selector：场景列表。
 *  注意：必须复用稳定的空数组引用，避免每次 rerender 产生新引用触发依赖 useEffect 死循环。
 */
const EMPTY_SCENES: readonly Scene[] = Object.freeze([]);
export function useSceneList(): Scene[] {
  return useClassroomStore((state) => (state.classroom?.scenes as Scene[] | undefined) ?? (EMPTY_SCENES as Scene[]));
}
