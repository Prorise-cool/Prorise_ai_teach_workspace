/**
 * 文件说明：Learning Center mock / real adapter（Epic 9）。
 * Real 端对齐 RuoYi `/xiaomai/learning-center/*` 控制器。
 */
import { readNumberProperty, readRecord, readStringProperty } from '@/lib/type-guards';
import type { ApiClient } from '@/services/api/client';
import { ApiClientError } from '@/services/api/client';
import { ruoyiClient } from '@/services/api/ruoyi-client';
import type { RuoyiEnvelope } from '@/types/auth';
import type {
  LearningCenterAggregateResponse,
  LearningCenterFavoriteFolder,
  LearningCenterFavoriteFolderState,
  LearningCenterPage,
  LearningCenterRecord,
} from '@/types/learning-center';

import { learningCenterMockFixtures } from '@/services/mock/fixtures/learning-center';
import { pickAdapterImplementation } from './base-adapter';

export type LearningCenterQuery = {
  userId: string;
  pageNum?: number;
  pageSize?: number;
  resultType?: string | null;
  status?: string | null;
  keyword?: string | null;
  favoriteOnly?: boolean | null;
  beginSourceTime?: string | null;
  endSourceTime?: string | null;
};

export type LearningCenterAction = {
  userId: string;
  sourceTable: string;
  sourceResultId: string;
};

export interface LearningCenterAdapter {
  getLearningPage(query: LearningCenterQuery): Promise<LearningCenterPage<LearningCenterRecord>>;
  getHistoryPage(query: LearningCenterQuery): Promise<LearningCenterPage<LearningCenterRecord>>;
  getFavoritesPage(query: LearningCenterQuery): Promise<LearningCenterPage<LearningCenterRecord>>;
  favorite(action: LearningCenterAction): Promise<void>;
  cancelFavorite(action: LearningCenterAction): Promise<void>;
  removeHistory(action: LearningCenterAction): Promise<void>;
  getFavoriteFolderState(query: { userId: string }): Promise<LearningCenterFavoriteFolderState>;
  createFavoriteFolder(action: { userId: string; folderName: string }): Promise<LearningCenterFavoriteFolder>;
  assignFavoriteFolder(action: { userId: string; recordId: string; folderId: string | null }): Promise<void>;
  removeFavoriteFolder(action: { userId: string; folderId: string }): Promise<void>;
  getLearningCenterSummary(query: { userId: string }): Promise<LearningCenterAggregateResponse>;
}

type ResolveLearningCenterAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

function buildQueryString(query: LearningCenterQuery) {
  const url = new URL('http://xiaomai.local');
  url.searchParams.set('userId', query.userId);
  url.searchParams.set('pageNum', String(query.pageNum ?? 1));
  url.searchParams.set('pageSize', String(query.pageSize ?? 10));
  if (query.resultType) url.searchParams.set('resultType', query.resultType);
  if (query.status) url.searchParams.set('status', query.status);
  if (query.keyword) url.searchParams.set('keyword', query.keyword);
  if (query.beginSourceTime) url.searchParams.set('beginSourceTime', query.beginSourceTime);
  if (query.endSourceTime) url.searchParams.set('endSourceTime', query.endSourceTime);
  if (query.favoriteOnly !== null && query.favoriteOnly !== undefined) {
    url.searchParams.set('favoriteOnly', query.favoriteOnly ? 'true' : 'false');
  }
  return url.search;
}

function unwrapTableDataInfo(payload: unknown, status: number): LearningCenterPage<LearningCenterRecord> {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '学习中心接口返回异常', payload);
  }

  const rows = envelope.rows;
  const total = readNumberProperty(envelope, 'total');

  if (!Array.isArray(rows) || total === undefined) {
    throw new ApiClientError(status, '学习中心接口返回异常', payload);
  }

  return {
    total,
    rows: rows as LearningCenterRecord[],
    code: readNumberProperty(envelope, 'code') ?? undefined,
    msg: readStringProperty(envelope, 'msg') ?? undefined,
  };
}

function unwrapRuoyiEnvelope<T>(payload: unknown, status: number) {
  const envelope = readRecord(payload);

  if (!envelope) {
    throw new ApiClientError(status, '学习中心接口返回异常', payload);
  }

  const businessCode = readNumberProperty(envelope, 'code');
  const message = readStringProperty(envelope, 'msg') ?? '学习中心接口返回异常';

  if (businessCode === undefined) {
    throw new ApiClientError(status, '学习中心接口返回异常', payload);
  }

  if (status >= 400 || businessCode !== 200) {
    throw new ApiClientError(status, message, payload);
  }

  return envelope.data as T;
}

export function createRealLearningCenterAdapter(
  { client = ruoyiClient }: { client?: ApiClient } = {},
): LearningCenterAdapter {
  return {
    async getLearningPage(query) {
      const response = await client.request<unknown>({
        url: `/xiaomai/learning-center/learning${buildQueryString(query)}`,
        method: 'get',
      });

      return unwrapTableDataInfo(response.data, response.status);
    },
    async getHistoryPage(query) {
      const response = await client.request<unknown>({
        url: `/xiaomai/learning-center/history${buildQueryString(query)}`,
        method: 'get',
      });

      return unwrapTableDataInfo(response.data, response.status);
    },
    async getFavoritesPage(query) {
      const response = await client.request<unknown>({
        url: `/xiaomai/learning-center/favorites${buildQueryString(query)}`,
        method: 'get',
      });

      return unwrapTableDataInfo(response.data, response.status);
    },
    async favorite(action) {
      const response = await client.request<RuoyiEnvelope<null>>({
        url: '/xiaomai/learning-center/favorite',
        method: 'post',
        data: action,
      });

      unwrapRuoyiEnvelope(response.data, response.status);
    },
    async cancelFavorite(action) {
      const response = await client.request<RuoyiEnvelope<null>>({
        url: '/xiaomai/learning-center/favorite/cancel',
        method: 'post',
        data: action,
      });

      unwrapRuoyiEnvelope(response.data, response.status);
    },
    async removeHistory(action) {
      const response = await client.request<RuoyiEnvelope<null>>({
        url: '/xiaomai/learning-center/history/remove',
        method: 'post',
        data: action,
      });

      unwrapRuoyiEnvelope(response.data, response.status);
    },
    async getFavoriteFolderState({ userId }) {
      // 收藏文件夹是非关键侧边数据，服务端错误（如表缺失、SQL 语法）不应阻断页面或
      // 把原始 SQL 错误文本弹给用户。静默降级为空状态，并把详细错误写进 console。
      try {
        const response = await client.request<RuoyiEnvelope<LearningCenterFavoriteFolderState>>({
          url: `/xiaomai/learning-center/favorite-folders?userId=${encodeURIComponent(userId)}`,
          method: 'get',
        });

        return unwrapRuoyiEnvelope(response.data, response.status);
      } catch (error) {
        console.warn('[learning-center] getFavoriteFolderState failed, falling back to empty state', error);
        return { folders: [], assignments: {} };
      }
    },
    async createFavoriteFolder(action) {
      const response = await client.request<RuoyiEnvelope<LearningCenterFavoriteFolder>>({
        url: '/xiaomai/learning-center/favorite-folders',
        method: 'post',
        data: action,
      });

      return unwrapRuoyiEnvelope(response.data, response.status);
    },
    async assignFavoriteFolder(action) {
      const response = await client.request<RuoyiEnvelope<null>>({
        url: '/xiaomai/learning-center/favorite-folders/assign',
        method: 'post',
        data: action,
      });

      unwrapRuoyiEnvelope(response.data, response.status);
    },
    async removeFavoriteFolder(action) {
      const response = await client.request<RuoyiEnvelope<null>>({
        url: '/xiaomai/learning-center/favorite-folders/remove',
        method: 'post',
        data: action,
      });

      unwrapRuoyiEnvelope(response.data, response.status);
    },
    async getLearningCenterSummary({ userId }) {
      const response = await client.request<RuoyiEnvelope<LearningCenterAggregateResponse>>({
        url: `/xiaomai/learning-center/summary?userId=${encodeURIComponent(userId)}`,
        method: 'get',
      });

      return unwrapRuoyiEnvelope<LearningCenterAggregateResponse>(response.data, response.status);
    },
  };
}

export function createMockLearningCenterAdapter(): LearningCenterAdapter {
  return {
    getLearningPage() {
      return Promise.resolve(learningCenterMockFixtures.learning.success);
    },
    getHistoryPage() {
      return Promise.resolve(learningCenterMockFixtures.history.success);
    },
    getFavoritesPage() {
      return Promise.resolve(learningCenterMockFixtures.favorites.success);
    },
    favorite() {
      return Promise.resolve();
    },
    cancelFavorite() {
      return Promise.resolve();
    },
    removeHistory() {
      return Promise.resolve();
    },
    getFavoriteFolderState() {
      return Promise.resolve({ folders: [], assignments: {} });
    },
    createFavoriteFolder() {
      return Promise.resolve({ folderId: 'mock-folder', folderName: 'Mock Folder', createTime: null });
    },
    assignFavoriteFolder() {
      return Promise.resolve();
    },
    removeFavoriteFolder() {
      return Promise.resolve();
    },
    getLearningCenterSummary() {
      return Promise.resolve<LearningCenterAggregateResponse>({
        averageQuizScore: 82,
        latestRecommendation: {
          summary: '生成单题讲解：隐函数求导的几何推导过程',
          targetRefId: 'mock-rec-001',
          sourceTime: new Date().toISOString(),
        },
        activeLearningPath: {
          pathId: 'mock-path-001',
          title: '微积分求导·进阶攻坚',
          completedStepCount: 3,
          totalStepCount: 8,
          versionNo: 1,
        },
      });
    },
  };
}

export function resolveLearningCenterAdapter(
  options: ResolveLearningCenterAdapterOptions = {},
): LearningCenterAdapter {
  const real = createRealLearningCenterAdapter({ client: options.client });
  const mock = createMockLearningCenterAdapter();

  return pickAdapterImplementation(
    {
      real,
      mock,
    },
    options,
  );
}
