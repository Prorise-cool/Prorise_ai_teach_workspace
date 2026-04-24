/**
 * 课堂状态 Zustand Store。
 * 管理当前激活的课堂、场景列表、当前场景和播放状态。
 */
import { create } from 'zustand';

import type { Classroom } from '../types/classroom';
import type { Scene, PlaybackStatus } from '../types/scene';
import type { AgentProfile } from '../types/agent';

/**
 * Spotlight 选项（与 OpenMAIC `lib/store/canvas.ts::SpotlightOptions` 对齐）。
 * radius 保留字段（当前未使用），dimness 是压暗层 alpha，transition 预留毫秒数。
 */
export interface SpotlightOptions {
  radius?: number;
  dimness?: number;
  transition?: number;
}

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
  // 当前 action 播放索引（-1 表示未开始）
  currentActionIndex: number;
  // 当前高亮的元素 ID（受 spotlight/laser 动作驱动）
  currentSpotlightId: string | null;
  // Spotlight 渲染选项（dimness 等）；未激活时为 null
  spotlightOptions: SpotlightOptions | null;
  // 当前讲述的语音内容（驱动教师气泡）
  currentSpeech: { agentId: string | null; text: string } | null;

  // —— Stage UI 状态（供 OpenMAIC 移植组件消费）——
  // 左侧场景边栏是否折叠
  sidebarCollapsed: boolean;
  // 右侧聊天/伴学面板是否折叠
  chatAreaCollapsed: boolean;
  // 右侧聊天面板宽度（px，可拖拽）
  chatAreaWidth: number;
  // 左侧场景边栏宽度（px，可拖拽）
  sidebarWidth: number;
  // 演示（全屏）模式
  isPresenting: boolean;
  // TTS 静音
  ttsMuted: boolean;
  // TTS 音量（0-1）
  ttsVolume: number;
  // 自动播放下一节
  autoPlayLecture: boolean;
  // 播放速度
  playbackSpeed: number;
}

export interface ClassroomStoreActions {
  setClassroom: (classroom: Classroom) => void;
  updateScenes: (scenes: Scene[]) => void;
  setCurrentScene: (sceneId: string | null) => void;
  setPlaybackStatus: (status: PlaybackStatus) => void;
  setAgents: (agents: AgentProfile[]) => void;
  setGenerationProgress: (progress: number, message?: string) => void;
  setCurrentActionIndex: (index: number) => void;
  setCurrentSpotlightId: (id: string | null) => void;
  /** 开启 Spotlight：等价 OpenMAIC `setSpotlight(elementId, options?)`。 */
  setSpotlight: (elementId: string, options?: SpotlightOptions) => void;
  /** 关闭 Spotlight：等价 OpenMAIC `clearSpotlight()`。 */
  clearSpotlight: () => void;
  setCurrentSpeech: (speech: { agentId: string | null; text: string } | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatAreaCollapsed: (collapsed: boolean) => void;
  setChatAreaWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setIsPresenting: (presenting: boolean) => void;
  setTTSMuted: (muted: boolean) => void;
  setTTSVolume: (volume: number) => void;
  setAutoPlayLecture: (enabled: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  resetPlayback: () => void;
  resetClassroom: () => void;
  reset: () => void;
}

const INITIAL_STATE: ClassroomStoreState = {
  classroom: null,
  currentSceneId: null,
  playbackStatus: 'idle',
  agents: [],
  generationProgress: 0,
  generationMessage: '',
  currentActionIndex: -1,
  currentSpotlightId: null,
  spotlightOptions: null,
  currentSpeech: null,
  // OpenMAIC parity defaults
  sidebarCollapsed: false,
  chatAreaCollapsed: false,
  chatAreaWidth: 340,
  sidebarWidth: 220,
  isPresenting: false,
  ttsMuted: false,
  ttsVolume: 1,
  autoPlayLecture: false,
  playbackSpeed: 1,
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

  setCurrentActionIndex: (index) => set({ currentActionIndex: index }),

  setCurrentSpotlightId: (id) => set({ currentSpotlightId: id }),

  setSpotlight: (elementId, options = {}) =>
    set({
      currentSpotlightId: elementId,
      spotlightOptions: {
        radius: 200,
        dimness: 0.7,
        transition: 300,
        ...options,
      },
    }),

  clearSpotlight: () =>
    set({
      currentSpotlightId: null,
      spotlightOptions: null,
    }),

  setCurrentSpeech: (speech) => set({ currentSpeech: speech }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setChatAreaCollapsed: (collapsed) => set({ chatAreaCollapsed: collapsed }),
  setChatAreaWidth: (width) => set({ chatAreaWidth: width }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setIsPresenting: (presenting) => set({ isPresenting: presenting }),
  setTTSMuted: (muted) => set({ ttsMuted: muted }),
  setTTSVolume: (volume) => set({ ttsVolume: volume }),
  setAutoPlayLecture: (enabled) => set({ autoPlayLecture: enabled }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  resetPlayback: () =>
    set({
      currentActionIndex: -1,
      currentSpotlightId: null,
      spotlightOptions: null,
      currentSpeech: null,
    }),

  /**
   * 切换课堂时调用：清空 classroom/scenes/agents/playback，但保留 UI 偏好
   * （sidebarWidth / chatAreaWidth / ttsVolume 等用户设置）。
   * 修复 TTS 跨课堂串：旧 currentSceneId 残留会让 useActionPlayer 在新课堂数据
   * 加载前继续读旧 scene.actions 触发 speechSynthesis。
   */
  resetClassroom: () =>
    set((state) => ({
      classroom: null,
      currentSceneId: null,
      playbackStatus: 'idle',
      agents: [],
      generationProgress: 0,
      generationMessage: '',
      currentActionIndex: -1,
      currentSpotlightId: null,
      spotlightOptions: null,
      currentSpeech: null,
      // 保留 UI 偏好
      sidebarCollapsed: state.sidebarCollapsed,
      chatAreaCollapsed: state.chatAreaCollapsed,
      sidebarWidth: state.sidebarWidth,
      chatAreaWidth: state.chatAreaWidth,
      isPresenting: false,
      ttsMuted: state.ttsMuted,
      ttsVolume: state.ttsVolume,
      autoPlayLecture: state.autoPlayLecture,
      playbackSpeed: state.playbackSpeed,
    })),

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
