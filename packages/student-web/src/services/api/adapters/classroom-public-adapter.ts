/**
 * 文件说明：课堂 publish / unpublish / 公开列表适配器。
 *
 * 镜像 video-publish-adapter + video-public-adapter 的设计，但合并成单文件：
 * - publish / unpublish：POST / DELETE /api/v1/classroom/tasks/{id}/publish
 * - 列出公开课堂：GET /api/v1/classroom/published
 *
 * 底层：RuoYi 的 xm_user_work 表（work_type=classroom）。
 */
import { type ApiClient, isApiClientError } from '@/services/api/client';
import { unwrapEnvelope } from '@/services/api/envelope';
import { fastapiClient } from '@/services/api/fastapi-client';

const BASE = '/api/v1/classroom';

export type ClassroomPublishResult = {
  taskId: string;
  published: boolean;
  publishedAt?: string | null;
};

export type ClassroomPublicCard = {
  taskId: string;
  title: string;
  description?: string | null;
  authorId?: string | null;
  publishedAt?: string | null;
  coverUrl?: string | null;
};

export type ClassroomPublicPage = {
  rows: ClassroomPublicCard[];
  total: number;
};

export type ClassroomPublicListQuery = {
  pageNum: number;
  pageSize: number;
};

export const DEFAULT_CLASSROOM_PUBLIC_QUERY: ClassroomPublicListQuery = {
  pageNum: 1,
  pageSize: 12,
};

export interface ClassroomPublicAdapter {
  publish(taskId: string, options?: { signal?: AbortSignal }): Promise<ClassroomPublishResult>;
  unpublish(taskId: string, options?: { signal?: AbortSignal }): Promise<ClassroomPublishResult>;
  listPublic(
    query?: Partial<ClassroomPublicListQuery>,
    options?: { signal?: AbortSignal },
  ): Promise<ClassroomPublicPage>;
}

export class ClassroomPublicAdapterError extends Error {
  name = 'ClassroomPublicAdapterError' as const;
  constructor(public status: number, public code: string, message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function mapError(error: unknown): ClassroomPublicAdapterError {
  if (error instanceof ClassroomPublicAdapterError) return error;
  if (isApiClientError(error)) {
    const payload = error.data as { code?: number | string; msg?: string } | undefined;
    return new ClassroomPublicAdapterError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }
  return new ClassroomPublicAdapterError(
    500,
    'CLASSROOM_PUBLIC_UNKNOWN',
    error instanceof Error ? error.message : '未知课堂公开适配错误',
  );
}

function createRealClassroomPublicAdapter(
  client: ApiClient = fastapiClient,
): ClassroomPublicAdapter {
  return {
    async publish(taskId, options) {
      try {
        const res = await client.request<{ data: ClassroomPublishResult }>({
          url: `${BASE}/tasks/${encodeURIComponent(taskId)}/publish`,
          method: 'post',
          signal: options?.signal,
        });
        return unwrapEnvelope(res);
      } catch (err) {
        throw mapError(err);
      }
    },
    async unpublish(taskId, options) {
      try {
        const res = await client.request<{ data: ClassroomPublishResult }>({
          url: `${BASE}/tasks/${encodeURIComponent(taskId)}/publish`,
          method: 'delete',
          signal: options?.signal,
        });
        return unwrapEnvelope(res);
      } catch (err) {
        throw mapError(err);
      }
    },
    async listPublic(query, options) {
      const resolved = { ...DEFAULT_CLASSROOM_PUBLIC_QUERY, ...query };
      const search = new URLSearchParams({
        pageNum: String(resolved.pageNum),
        pageSize: String(resolved.pageSize),
      });
      try {
        const res = await client.request<{ data: ClassroomPublicPage }>({
          url: `${BASE}/published?${search.toString()}`,
          method: 'get',
          signal: options?.signal,
        });
        return unwrapEnvelope(res);
      } catch (err) {
        throw mapError(err);
      }
    },
  };
}

let cached: ClassroomPublicAdapter | null = null;

export function resolveClassroomPublicAdapter(): ClassroomPublicAdapter {
  return cached ??= createRealClassroomPublicAdapter();
}

export { createRealClassroomPublicAdapter };
