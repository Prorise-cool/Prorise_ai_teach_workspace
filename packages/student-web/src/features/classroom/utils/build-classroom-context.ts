/**
 * 课堂 chat 上下文快照构建。
 *
 * Phase 4：前端每次发消息前即时拼装结构化上下文 payload，直接喂到后端
 * `ChatContextPayload`（`routes_chat._to_orch_context` 会映射到 orchestration
 * `ClassroomContext.scene_title / scene_body / key_points / recent_speech /
 * canvas_summary`）。
 *
 * 这替代原 `use-director-chat` 里把 `"课程主题：X | 当前场景：Y"` 拼成一行
 * 字符串塞给后端的做法 —— 那种做法让老师只能"根据标题推测"内容，无法
 * 说出场景正文和画布细节。
 */
import type { Classroom } from '../types/classroom';
import type { Action, SpeechAction } from '../types/action';
import type { Scene, SlideContent, SlideElement } from '../types/scene';

import { summarizeElements } from './summarize-elements';

/** 对齐后端 `ChatContextPayload`（camelCase，由 FastAPI alias 承接）。 */
export interface ClassroomChatContextPayload {
  sceneId?: string;
  sceneTitle?: string;
  sceneBody?: string;
  keyPoints?: string[];
  recentSpeech?: string;
  canvasSummary?: string;
}

/**
 * 抽出最近若干个 speech action 文本（按先后顺序），截断到总长度上限。
 * 不包含 laser / spotlight / discussion 等非讲解动作。
 */
function extractRecentSpeech(
  actions: readonly Action[] | undefined,
  limit: number = 3,
  maxChars: number = 400,
): string | undefined {
  if (!actions || actions.length === 0) return undefined;
  const speeches = actions.filter(
    (a): a is SpeechAction => a.type === 'speech' && !!a.text,
  );
  if (speeches.length === 0) return undefined;
  const picked = speeches.slice(-limit).map((s) => s.text.trim());
  const joined = picked.join(' ');
  return joined.length > maxChars
    ? joined.slice(0, maxChars) + '...'
    : joined;
}

/** 从 slide scene 的 content 里取 elements（其它类型返回 []）。 */
function getSlideElements(scene: Scene | null | undefined): readonly SlideElement[] {
  if (!scene || scene.type !== 'slide') return [];
  const content = scene.content as SlideContent | undefined;
  return content?.elements ?? [];
}

/**
 * 从 slide content 抽"场景正文"—— 把所有 text 元素的纯文本拼起来。
 *
 * 这是老师实际讲的"页面上写了什么"，比 scene.title 或 keyPoints 更贴近
 * 学生提问的上下文（典型场景：学生指着屏幕问"这段公式什么意思"）。
 */
function extractSceneBody(
  scene: Scene | null | undefined,
  maxChars: number = 600,
): string | undefined {
  if (!scene || scene.type !== 'slide') return undefined;
  const elements = getSlideElements(scene);
  const texts: string[] = [];
  for (const el of elements) {
    if (el.type === 'text' && el.content) {
      const plain = el.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) texts.push(plain);
    } else if (el.type === 'latex' && el.content) {
      texts.push(`[公式] ${el.content.trim()}`);
    }
  }
  if (texts.length === 0) return undefined;
  const joined = texts.join(' / ');
  return joined.length > maxChars
    ? joined.slice(0, maxChars) + '...'
    : joined;
}

/**
 * 构建课堂 chat 上下文快照。
 * 所有字段都是可选，没有对应数据时字段直接省略（后端 Pydantic 兼容）。
 */
export function buildClassroomContext(params: {
  classroom: Classroom | null;
  scene: Scene | null | undefined;
}): ClassroomChatContextPayload {
  const { scene } = params;
  if (!scene) return {};

  const payload: ClassroomChatContextPayload = {
    sceneId: scene.id,
    sceneTitle: scene.title || scene.outline?.title,
  };

  const body = extractSceneBody(scene);
  if (body) payload.sceneBody = body;

  const keyPoints = scene.outline?.keyPoints?.filter((k) => !!k?.trim()) ?? [];
  if (keyPoints.length > 0) payload.keyPoints = keyPoints;

  const recentSpeech = extractRecentSpeech(scene.actions);
  if (recentSpeech) payload.recentSpeech = recentSpeech;

  const elements = getSlideElements(scene);
  if (elements.length > 0) {
    payload.canvasSummary = summarizeElements(elements);
  }

  return payload;
}
