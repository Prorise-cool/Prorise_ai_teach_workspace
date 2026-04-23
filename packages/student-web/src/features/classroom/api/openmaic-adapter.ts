/**
 * OpenMAIC FastAPI 后端 API 适配器。
 * 所有 LLM 调用通过 FastAPI 后端转发，不直接调用 LLM SDK。
 * 使用 fastapiClient.request() 模式与项目其他 adapter 保持一致。
 */
import { fastapiClient } from '@/services/api/fastapi-client';
import { resolveFastapiBaseUrl } from '@/services/api/fastapi-base-url';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import type { ClassroomCreateRequest, ClassroomJobResponse } from '../types/classroom';
import type { SceneOutline } from '../types/scene';
import type { AgentProfile, AgentProfileRequest } from '../types/agent';
import type { ChatRequest, ChatEvent } from '../types/chat';
import type { QuizGradeRequest, QuizGradeResult } from '../types/quiz';

const BASE = '/api/v1/classroom';

/** 提交课堂生成任务 → 返回 jobId */
export async function submitClassroom(req: ClassroomCreateRequest): Promise<{ jobId: string }> {
  const response = await fastapiClient.request<{ jobId: string }>({
    url: `${BASE}/classroom`,
    method: 'post',
    data: req,
  });
  return response.data;
}

/** 轮询任务状态 */
export async function getClassroomStatus(jobId: string): Promise<ClassroomJobResponse> {
  const response = await fastapiClient.request<ClassroomJobResponse>({
    url: `${BASE}/classroom/${jobId}`,
    method: 'get',
  });
  return response.data;
}

/** SSE 流辅助：构建认证请求头 */
function buildSseHeaders(): Record<string, string> {
  const token = useAuthSessionStore.getState().session?.accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** SSE 流辅助：解析 SSE 响应流 */
async function* parseSseStream<T>(response: Response): AsyncIterable<T> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]' || !payload) continue;
      try {
        yield JSON.parse(payload) as T;
      } catch {
        // 忽略解析错误
      }
    }
  }
}

/** 生成场景提纲（SSE 流） */
export async function* streamSceneOutlines(
  req: ClassroomCreateRequest,
  signal?: AbortSignal,
): AsyncIterable<SceneOutline> {
  const response = await fetch(`${resolveFastapiBaseUrl()}${BASE}/generate/scene-outlines-stream`, {
    method: 'POST',
    headers: buildSseHeaders(),
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`场景提纲生成失败: ${response.status}`);
  }

  yield* parseSseStream<SceneOutline>(response);
}

/** 生成场景内容（一次性） */
export async function generateSceneContent(req: {
  outline: SceneOutline;
  requirement: string;
  agentIds: string[];
}): Promise<unknown> {
  const response = await fastapiClient.request<unknown>({
    url: `${BASE}/generate/scene-content`,
    method: 'post',
    data: req,
  });
  return response.data;
}

/** 生成场景动作序列 */
export async function generateSceneActions(req: {
  sceneId: string;
  sceneContent: unknown;
  agentIds: string[];
}): Promise<unknown[]> {
  const response = await fastapiClient.request<unknown[]>({
    url: `${BASE}/generate/scene-actions`,
    method: 'post',
    data: req,
  });
  return response.data;
}

/** 生成智能体档案 */
export async function generateAgentProfiles(req: AgentProfileRequest): Promise<AgentProfile[]> {
  const response = await fastapiClient.request<AgentProfile[]>({
    url: `${BASE}/generate/agent-profiles`,
    method: 'post',
    data: req,
  });
  return response.data;
}

/** 多智能体讨论（SSE 流） */
export async function* streamChat(
  req: ChatRequest,
  signal?: AbortSignal,
): AsyncIterable<ChatEvent> {
  const response = await fetch(`${resolveFastapiBaseUrl()}${BASE}/chat`, {
    method: 'POST',
    headers: buildSseHeaders(),
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`聊天流启动失败: ${response.status}`);
  }

  yield* parseSseStream<ChatEvent>(response);
}

/** 测验评分 */
export async function gradeQuiz(req: QuizGradeRequest): Promise<QuizGradeResult> {
  const response = await fastapiClient.request<QuizGradeResult>({
    url: `${BASE}/quiz-grade`,
    method: 'post',
    data: req,
  });
  return response.data;
}

/** PDF 文本提取 */
export async function parsePdf(formData: FormData): Promise<{ text: string }> {
  const token = useAuthSessionStore.getState().session?.accessToken;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${resolveFastapiBaseUrl()}${BASE}/parse-pdf`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) throw new Error(`PDF 解析失败: ${response.status}`);
  return response.json() as Promise<{ text: string }>;
}
