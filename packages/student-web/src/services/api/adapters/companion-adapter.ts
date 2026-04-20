/**
 * Companion 智能侧栏 API adapter。
 * Story 6.2：提供 bootstrap 和 ask 接口的 mock / real 抽象。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
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

export interface CompanionAdapter {
  bootstrap(
    taskId: string,
    options?: CompanionQueryOptions,
  ): Promise<CompanionBootstrapResponse>;

  ask(
    request: CompanionAskRequest,
    options?: CompanionQueryOptions,
  ): Promise<CompanionAskResponse>;
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

        return toFrontendBootstrap(response.data.data);
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

        return toFrontendAskResponse(response.data.data);
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
