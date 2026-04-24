/**
 * 文件说明：课堂（OpenMAIC 多智能体）API adapter，统一收口提交、轮询、
 * SSE 与一次性生成接口。
 *
 * Wave 1：原 `features/openmaic/api/openmaic-adapter.ts` 的能力按
 * `services/api/adapters/*` 模式重写：
 * - 走 `apiClient.request()`（fastapiClient）+ `unwrapEnvelope<T>`，
 *   不再绕过统一信封。
 * - SSE 复用 `eventsource-parser`（与 `services/sse/parsers.ts` 同款），
 *   避免每个 adapter 自实现 `reader.read() + 手撕 split`。
 * - 暴露 `ClassroomAdapter` 接口 + `resolveClassroomAdapter()`，与
 *   `video-task-adapter` / `companion-adapter` 风格保持一致。
 */
import {
  createParser,
  type EventSourceMessage,
  type ParseError,
} from 'eventsource-parser';

import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { unwrapEnvelope } from '@/services/api/envelope';
import { fastapiClient } from '@/services/api/fastapi-client';
import { resolveFastapiBaseUrl } from '@/services/api/fastapi-base-url';
import { useAuthSessionStore } from '@/stores/auth-session-store';

import type {
  AgentProfile,
  AgentProfileRequest,
} from '@/features/classroom/types/agent';
import type {
  ChatEvent,
  ChatRequest,
  CompanionAskParams,
} from '@/features/classroom/types/chat';
import type {
  ClassroomCreateRequest,
  ClassroomJobResponse,
} from '@/features/classroom/types/classroom';
import type { SceneOutline } from '@/features/classroom/types/scene';
import type {
  QuizGradeRequest,
  QuizGradeResult,
} from '@/features/classroom/types/quiz';

import { pickAdapterImplementation } from './base-adapter';

const BASE = '/api/v1/classroom';

/* ---------- 类型定义 ---------- */

type ClassroomCallOptions = {
  signal?: AbortSignal;
};

type ResolveClassroomAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealClassroomAdapterOptions = {
  client?: ApiClient;
};

/** 课堂 adapter 接口。 */
export interface ClassroomAdapter {
  /** 提交课堂生成任务，返回后端任务 ID。 */
  submit(
    request: ClassroomCreateRequest,
    options?: ClassroomCallOptions,
  ): Promise<{ taskId: string }>;
  /** 轮询课堂任务状态。 */
  getStatus(
    taskId: string,
    options?: ClassroomCallOptions,
  ): Promise<ClassroomJobResponse>;
  /** SSE：流式生成场景大纲。 */
  streamSceneOutlines(
    request: ClassroomCreateRequest,
    options?: ClassroomCallOptions,
  ): AsyncIterable<SceneOutline>;
  /** 一次性生成单个场景内容。 */
  generateSceneContent(
    request: {
      outline: SceneOutline;
      requirement: string;
      agentIds: string[];
    },
    options?: ClassroomCallOptions,
  ): Promise<unknown>;
  /** 一次性生成场景动作序列。 */
  generateSceneActions(
    request: {
      sceneId: string;
      sceneContent: unknown;
      agentIds: string[];
    },
    options?: ClassroomCallOptions,
  ): Promise<unknown[]>;
  /** 生成智能体档案。 */
  generateAgentProfiles(
    request: AgentProfileRequest,
    options?: ClassroomCallOptions,
  ): Promise<AgentProfile[]>;
  /** SSE：多智能体讨论。 */
  streamChat(
    request: ChatRequest,
    options?: ClassroomCallOptions,
  ): AsyncIterable<ChatEvent>;
  /**
   * Phase 4 · 共享 Companion 侧栏入口：把一次 ask 封装成文本事件流。
   * 底层复用 `streamChat`，只筛取 text_delta 与 error。
   */
  askCompanion(
    params: CompanionAskParams,
    options?: ClassroomCallOptions,
  ): AsyncIterable<{ type: 'text'; content: string } | { type: 'error'; message: string }>;
  /** 测验自动评分。 */
  gradeQuiz(
    request: QuizGradeRequest,
    options?: ClassroomCallOptions,
  ): Promise<QuizGradeResult>;
  /** 解析上传 PDF 文件文本。 */
  parsePdf(
    formData: FormData,
    options?: ClassroomCallOptions,
  ): Promise<{ text: string }>;
}

/* ---------- 辅助：SSE / 鉴权 ---------- */

/**
 * 构造带认证的 SSE 请求头。
 *
 * @returns 含 `Authorization` / `Accept: text/event-stream` 的 header。
 */
function buildSseHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const accessToken =
    useAuthSessionStore.getState().session?.accessToken ?? null;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * 流式解析 JSON SSE 响应（每个 `data:` 是一段 JSON）。
 *
 * 与 `services/sse/parsers.ts:streamTaskEventResponse` 同源，使用
 * `eventsource-parser` 拆分 SSE 协议帧；JSON payload 解析失败的事件被忽略。
 *
 * @param response - fetch 返回的响应对象。
 * @returns 异步生成 `T` 形状的事件序列。
 */
async function* streamJsonSseResponse<T>(
  response: Response,
): AsyncIterable<T> {
  if (!response.ok || !response.body) {
    throw new Error(`SSE 请求失败：${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const queue: string[] = [];
  let streamCompleted = false;

  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      if (!event.data || event.data === '[DONE]') {
        return;
      }
      queue.push(event.data);
    },
    onError(_error: ParseError) {
      /* 忽略 SSE 协议级噪音；上层只关心 JSON 事件。 */
    },
  });

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        streamCompleted = true;
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));

      while (queue.length > 0) {
        const data = queue.shift()!;
        try {
          yield JSON.parse(data) as T;
        } catch {
          /* 静默忽略畸形 JSON 行，与原 openmaic-adapter 行为一致。 */
        }
      }
    }

    parser.feed(`${decoder.decode()}\n\n`);

    while (queue.length > 0) {
      const data = queue.shift()!;
      try {
        yield JSON.parse(data) as T;
      } catch {
        /* ignore */
      }
    }
  } finally {
    if (!streamCompleted) {
      await reader.cancel().catch(() => undefined);
    }

    reader.releaseLock();
  }
}

/**
 * 将 ApiClient 异常透传为带语义的 Error，让 hook 层可以读 message。
 *
 * @param error - 原始异常。
 * @returns 转换后的 Error。
 */
function mapClassroomApiError(error: unknown): Error {
  if (isApiClientError(error)) {
    const payload = error.data as { msg?: string } | undefined;
    return new Error(payload?.msg ?? error.message ?? '课堂接口异常');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('未知课堂接口错误');
}

/* ---------- Real Adapter ---------- */

/**
 * 创建真实课堂 adapter（连接 FastAPI 后端）。
 *
 * @param options - 真实 adapter 参数。
 * @returns 真实课堂 adapter。
 */
export function createRealClassroomAdapter(
  { client = fastapiClient }: RealClassroomAdapterOptions = {},
): ClassroomAdapter {
  return {
    async submit(request, options) {
      try {
        const response = await client.request<{ data: { taskId: string } }>({
          url: `${BASE}/generate/classroom`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    async getStatus(taskId, options) {
      try {
        const response = await client.request<{ data: ClassroomJobResponse }>({
          url: `${BASE}/generate/classroom/${taskId}`,
          method: 'get',
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    streamSceneOutlines(request, options) {
      return (async function* () {
        const response = await fetch(
          `${resolveFastapiBaseUrl()}${BASE}/generate/scene-outlines-stream`,
          {
            method: 'POST',
            headers: buildSseHeaders(),
            body: JSON.stringify(request),
            signal: options?.signal,
          },
        );

        yield* streamJsonSseResponse<SceneOutline>(response);
      })();
    },

    async generateSceneContent(request, options) {
      try {
        const response = await client.request<{ data: unknown }>({
          url: `${BASE}/generate/scene-content`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    async generateSceneActions(request, options) {
      try {
        const response = await client.request<{ data: unknown[] }>({
          url: `${BASE}/generate/scene-actions`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    async generateAgentProfiles(request, options) {
      try {
        const response = await client.request<{ data: AgentProfile[] }>({
          url: `${BASE}/generate/agent-profiles`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    streamChat(request, options) {
      return (async function* () {
        const response = await fetch(
          `${resolveFastapiBaseUrl()}${BASE}/chat`,
          {
            method: 'POST',
            headers: buildSseHeaders(),
            body: JSON.stringify(request),
            signal: options?.signal,
          },
        );

        yield* streamJsonSseResponse<ChatEvent>(response);
      })();
    },

    askCompanion(params, options) {
      const self = this;
      return (async function* () {
        // 只发单轮：history（若有）+ 当前 user 问题
        const messages = [
          ...(params.history ?? []),
          { role: 'user' as const, content: params.questionText },
        ];
        const request: ChatRequest = {
          messages,
          agents: params.agents ?? [],
          classroomContext: params.classroomContext,
          languageDirective: params.languageDirective,
          taskId: params.taskId,
        };
        try {
          for await (const event of self.streamChat(request, options)) {
            if (event.type === 'text_delta') {
              const content = event.data?.content ?? '';
              if (content) yield { type: 'text' as const, content };
            } else if (event.type === 'error') {
              yield { type: 'error' as const, message: event.data.message };
              return;
            } else if (event.type === 'done') {
              return;
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : '未知错误';
          yield { type: 'error' as const, message };
        }
      })();
    },

    async gradeQuiz(request, options) {
      try {
        const response = await client.request<{ data: QuizGradeResult }>({
          url: `${BASE}/quiz-grade`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return unwrapEnvelope(response);
      } catch (error) {
        throw mapClassroomApiError(error);
      }
    },

    async parsePdf(formData, options) {
      const accessToken =
        useAuthSessionStore.getState().session?.accessToken ?? null;
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${resolveFastapiBaseUrl()}${BASE}/parse-pdf`,
        {
          method: 'POST',
          headers,
          body: formData,
          signal: options?.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`PDF 解析失败：${response.status}`);
      }

      return (await response.json()) as { text: string };
    },
  };
}

/* ---------- Mock Adapter ---------- */

/**
 * 在微任务中执行 mock 课堂逻辑，模拟异步接口语义。
 *
 * @param operation - 需要执行的 mock 操作。
 * @returns 异步化后的 mock 执行结果。
 */
function runMockClassroomOperation<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

/**
 * 创建本地 mock 课堂 adapter。
 *
 * Wave 1 暂仅提供能让上层 hook/组件不崩溃的最小响应；实际 mock 数据
 * 由后续 fixture / Storybook 阶段补齐。
 *
 * @returns mock 课堂 adapter。
 */
export function createMockClassroomAdapter(): ClassroomAdapter {
  return {
    submit() {
      return runMockClassroomOperation(() => ({ taskId: 'mock-classroom-task' }));
    },
    getStatus(taskId) {
      return runMockClassroomOperation<ClassroomJobResponse>(() => ({
        taskId,
        status: 'pending',
        progress: 0,
        message: 'mock pending',
      }));
    },
    streamSceneOutlines() {
      return (async function* () {
        /* mock: empty stream */
      })();
    },
    generateSceneContent() {
      return runMockClassroomOperation<unknown>(() => ({}));
    },
    generateSceneActions() {
      return runMockClassroomOperation<unknown[]>(() => []);
    },
    generateAgentProfiles() {
      return runMockClassroomOperation<AgentProfile[]>(() => []);
    },
    streamChat() {
      return (async function* () {
        /* mock: empty stream */
      })();
    },
    askCompanion() {
      return (async function* () {
        yield { type: 'text' as const, content: '(mock companion reply)' };
      })();
    },
    gradeQuiz() {
      return runMockClassroomOperation<QuizGradeResult>(() => ({
        correct: false,
        feedback: 'mock feedback',
      }));
    },
    parsePdf() {
      return runMockClassroomOperation(() => ({ text: '' }));
    },
  };
}

/* ---------- Resolver ---------- */

let cachedRealAdapter: ClassroomAdapter | null = null;
let cachedMockAdapter: ClassroomAdapter | null = null;

/**
 * 根据运行模式选择 mock 或 real 课堂 adapter（带模块级缓存以保证
 * `streamChat()` 等返回的迭代器引用稳定）。
 *
 * @param options - 课堂 adapter 解析参数。
 * @returns 当前运行模式对应的课堂 adapter。
 */
export function resolveClassroomAdapter(
  options: ResolveClassroomAdapterOptions = {},
): ClassroomAdapter {
  const realAdapter =
    options.client !== undefined
      ? createRealClassroomAdapter({ client: options.client })
      : (cachedRealAdapter ??= createRealClassroomAdapter());

  const mockAdapter = (cachedMockAdapter ??= createMockClassroomAdapter());

  return pickAdapterImplementation(
    {
      mock: mockAdapter,
      real: realAdapter,
    },
    {
      useMock: options.useMock,
    },
  );
}
