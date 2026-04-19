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
          CompanionEnvelope<CompanionBootstrapResponse>
        >({
          url: `/api/v1/companion/bootstrap?taskId=${encodeURIComponent(taskId)}`,
          method: 'get',
          signal: options?.signal,
        });

        return response.data.data;
      } catch (error) {
        throw mapCompanionError(error);
      }
    },
    async ask(request, options) {
      try {
        const response = await client.request<
          CompanionEnvelope<CompanionAskResponse>
        >({
          url: `/api/v1/companion/ask`,
          method: 'post',
          data: request,
          signal: options?.signal,
        });

        return response.data.data;
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
