/**
 * Companion 智能侧栏 API adapter。
 * Story 6.2：提供 bootstrap 和 ask 接口的 mock / real 抽象。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { unwrapEnvelope } from '@/services/api/envelope';
import { fastapiClient } from '@/services/api/fastapi-client';

import { pickAdapterImplementation } from './base-adapter';
import {
  getCompanionAskFixture,
  getCompanionBootstrapFixture,
} from '@/services/mock/fixtures/companion';
import type {
  CompanionAnchor,
  CompanionAskRequest,
  CompanionAskResponse,
  CompanionBootstrapResponse,
  CompanionMockScenario,
} from '@/types/companion';

/* ---------- 请求选项 ---------- */

type CompanionQueryOptions = {
  scenario?: CompanionMockScenario;
  signal?: AbortSignal;
};

type ResolveCompanionAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

/* ---------- 错误类型 ---------- */

export class CompanionAdapterError extends Error {
  name = 'CompanionAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/* ---------- Adapter 接口 ---------- */

export interface CompanionHistoryTurn {
  turnId: string;
  sessionId: string;
  userId: string;
  contextType: string;
  anchor: {
    contextType: string;
    anchorKind: string;
    anchorRef: string;
    scopeSummary?: string | null;
  };
  questionText: string;
  answerSummary: string;
  sourceSummary?: string | null;
  persistenceStatus: string;
  /** ISO-8601 时间戳；后端回包字段名 create_time。 */
  createTime: string;
}

export interface CompanionHistoryPage {
  total: number;
  rows: CompanionHistoryTurn[];
}

export interface CompanionSessionReplay {
  sessionId: string;
  companionTurns: CompanionHistoryTurn[];
}

export interface CompanionAdapter {
  bootstrap(
    taskId: string,
    options?: CompanionQueryOptions,
  ): Promise<CompanionBootstrapResponse>;

  ask(
    request: CompanionAskRequest,
    options?: CompanionQueryOptions,
  ): Promise<CompanionAskResponse>;

  listHistory(
    params: { pageNum?: number; pageSize?: number },
    options?: { signal?: AbortSignal },
  ): Promise<CompanionHistoryPage>;

  getSessionReplay(
    sessionId: string,
    options?: { signal?: AbortSignal },
  ): Promise<CompanionSessionReplay>;
}

/* ---------- 错误映射 ---------- */

function mapCompanionError(error: unknown): CompanionAdapterError {
  if (error instanceof CompanionAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | { code?: string; msg?: string }
      | undefined;

    return new CompanionAdapterError(
      error.status,
      payload?.code ?? String(error.status),
      payload?.msg ?? error.message,
    );
  }

  return new CompanionAdapterError(
    500,
    'COMPANION_UNKNOWN',
    error instanceof Error ? error.message : '未知 Companion 适配错误',
  );
}

/* ---------- Envelope ---------- */

type CompanionEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

/* ---------- 后端 snake_case ↔ 前端 camelCase 转换 ---------- */

type BackendAnchorContext = {
  context_type: string;
  anchor_kind: string;
  anchor_ref: string;
  scope_summary?: string | null;
  scope_window?: string | null;
};

type BackendAskRequestBody = {
  session_id: string;
  anchor: BackendAnchorContext;
  question_text: string;
  parent_turn_id: string | null;
  frame_base64?: string | null;
};

type BackendAskResponseData = {
  turn_id: string;
  answer_text: string;
  anchor: BackendAnchorContext;
  whiteboard_actions: {
    action_type: string;
    payload: Record<string, unknown>;
    render_uri?: string | null;
  }[];
  source_refs: Record<string, unknown>[];
  persistence_status: string;
  context_source_hit: string;
};

type BackendBootstrapResponseData = {
  task_id: string;
  session_id: string;
  context_source: string;
  knowledge_points: string[];
  topic_summary: string;
};

function toBackendAnchor(anchor: CompanionAnchor): BackendAnchorContext {
  return {
    context_type: 'video',
    anchor_kind: 'video_timestamp',
    anchor_ref: `${anchor.taskId}@${Math.floor(anchor.seconds)}`,
    scope_summary: anchor.sectionTitle ?? null,
  };
}

function toBackendAskRequest(request: CompanionAskRequest): BackendAskRequestBody {
  return {
    session_id: request.sessionId,
    anchor: toBackendAnchor(request.anchor),
    question_text: request.questionText,
    parent_turn_id: request.parentTurnId ?? null,
    frame_base64: request.frameBase64 ?? null,
  };
}

function toFrontendAskResponse(data: BackendAskResponseData): CompanionAskResponse {
  return {
    turnId: data.turn_id,
    answerText: data.answer_text,
    anchor: {
      taskId: data.anchor.anchor_ref.split('@')[0] ?? '',
      seconds: parseInt(data.anchor.anchor_ref.split('@')[1] ?? '0', 10),
      sectionTitle: data.anchor.scope_summary ?? undefined,
    },
    whiteboardActions: data.whiteboard_actions.map((a) => ({
      actionType: a.action_type as CompanionAskResponse['whiteboardActions'][number]['actionType'],
      payload: a.payload,
      renderUri: a.render_uri ?? null,
    })),
    sourceRefs: data.source_refs,
    persistenceStatus: data.persistence_status as CompanionAskResponse['persistenceStatus'],
    contextSourceHit: data.context_source_hit as CompanionAskResponse['contextSourceHit'],
  };
}

type BackendCompanionTurnSnapshot = {
  turn_id: string;
  session_id: string;
  user_id: string;
  context_type: string;
  anchor: BackendAnchorContext;
  question_text: string;
  answer_summary: string;
  source_summary?: string | null;
  persistence_status: string;
  created_at: string;
};

type BackendHistoryResponseData = {
  total: number;
  rows: BackendCompanionTurnSnapshot[];
};

type BackendSessionReplayData = {
  session_id: string;
  companion_turns: BackendCompanionTurnSnapshot[];
};

function toFrontendCompanionTurn(data: BackendCompanionTurnSnapshot): CompanionHistoryTurn {
  return {
    turnId: data.turn_id,
    sessionId: data.session_id,
    userId: data.user_id,
    contextType: data.context_type,
    anchor: {
      contextType: data.anchor.context_type,
      anchorKind: data.anchor.anchor_kind,
      anchorRef: data.anchor.anchor_ref,
      scopeSummary: data.anchor.scope_summary ?? null,
    },
    questionText: data.question_text,
    answerSummary: data.answer_summary,
    sourceSummary: data.source_summary ?? null,
    persistenceStatus: data.persistence_status,
    createTime: data.created_at,
  };
}

function toFrontendBootstrap(data: BackendBootstrapResponseData): CompanionBootstrapResponse {
  return {
    taskId: data.task_id,
    sessionId: data.session_id,
    contextSource: data.context_source as CompanionBootstrapResponse['contextSource'],
    knowledgePoints: data.knowledge_points,
    topicSummary: data.topic_summary,
  };
}

/* ---------- Mock 实现 ---------- */

export function createMockCompanionAdapter(): CompanionAdapter {
  return {
    bootstrap(taskId) {
      const fixture = getCompanionBootstrapFixture(taskId);
      return Promise.resolve(fixture);
    },
    ask(request, options) {
      const fixture = getCompanionAskFixture(
        options?.scenario ?? 'first_ask',
        request,
      );
      return Promise.resolve(fixture);
    },
    listHistory() {
      return Promise.resolve({ total: 0, rows: [] });
    },
    getSessionReplay(sessionId) {
      return Promise.resolve({ sessionId, companionTurns: [] });
    },
  };
}

/* ---------- Real 实现 ---------- */

export function createRealCompanionAdapter(
  { client = fastapiClient }: { client?: ApiClient } = {},
): CompanionAdapter {
  return {
    async bootstrap(taskId, options) {
      try {
        const response = await client.request<
          CompanionEnvelope<BackendBootstrapResponseData>
        >({
          url: `/api/v1/companion/bootstrap?taskId=${encodeURIComponent(taskId)}`,
          method: 'get',
          signal: options?.signal,
        });

        return toFrontendBootstrap(unwrapEnvelope(response));
      } catch (error) {
        throw mapCompanionError(error);
      }
    },
    async ask(request, options) {
      try {
        const response = await client.request<
          CompanionEnvelope<BackendAskResponseData>
        >({
          url: `/api/v1/companion/ask`,
          method: 'post',
          data: toBackendAskRequest(request),
          signal: options?.signal,
        });

        return toFrontendAskResponse(unwrapEnvelope(response));
      } catch (error) {
        throw mapCompanionError(error);
      }
    },
    async listHistory(params, options) {
      try {
        const pageNum = params.pageNum ?? 1;
        const pageSize = params.pageSize ?? 10;
        const response = await client.request<
          CompanionEnvelope<BackendHistoryResponseData>
        >({
          url: `/api/v1/companion/history?pageNum=${pageNum}&pageSize=${pageSize}`,
          method: 'get',
          signal: options?.signal,
        });
        const data = unwrapEnvelope(response);
        return {
          total: data.total ?? 0,
          rows: (data.rows ?? []).map(toFrontendCompanionTurn),
        };
      } catch (error) {
        throw mapCompanionError(error);
      }
    },
    async getSessionReplay(sessionId, options) {
      try {
        // 这个端点直接返回 SessionReplaySnapshot（不包 envelope），
        // 不要走 unwrapEnvelope。
        const response = await client.request<BackendSessionReplayData>({
          url: `/api/v1/companion/sessions/${encodeURIComponent(sessionId)}/replay`,
          method: 'get',
          signal: options?.signal,
        });
        const data = response.data;
        return {
          sessionId: data.session_id,
          companionTurns: (data.companion_turns ?? []).map(toFrontendCompanionTurn),
        };
      } catch (error) {
        throw mapCompanionError(error);
      }
    },
  };
}

/* ---------- Resolver ---------- */

export function resolveCompanionAdapter(
  options: ResolveCompanionAdapterOptions = {},
): CompanionAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockCompanionAdapter(),
      real: createRealCompanionAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    { useMock: options.useMock },
  );
}
