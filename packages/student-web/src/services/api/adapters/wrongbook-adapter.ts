/**
 * 文件说明：错题本（wrongbook）adapter（Epic 9 P0 收口）。
 *
 * 实际落表在 RuoYi `xm_learning_wrongbook`，list 复用既有
 * `/xiaomai/learning-center/history?resultType=wrongbook` 聚合查询，
 * 直接返回 LearningCenterRecord（summary 字段已映射 wrongbook.analysis_summary）。
 *
 * 之所以建独立 adapter 而不是直接用 learning-center-adapter，是因为
 * 1) wrongbook 页面未来会扩出更丰富的字段（题干、错答、参考答案），
 * 2) 独立 adapter 便于按页面维度 mock / 替换实现。
 */
import type { ApiClient } from '@/services/api/client';
import { ruoyiClient } from '@/services/api/ruoyi-client';
import {
  createMockLearningCenterAdapter,
  createRealLearningCenterAdapter,
  type LearningCenterQuery,
} from '@/services/api/adapters/learning-center-adapter';
import type { LearningCenterPage, LearningCenterRecord } from '@/types/learning-center';

import { pickAdapterImplementation } from './base-adapter';

export type WrongbookListQuery = {
  userId: string;
  pageNum?: number;
  pageSize?: number;
};

export interface WrongbookAdapter {
  listWrongbook(query: WrongbookListQuery): Promise<LearningCenterPage<LearningCenterRecord>>;
}

type ResolveWrongbookAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

function withResultType(query: WrongbookListQuery): LearningCenterQuery {
  return {
    userId: query.userId,
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    resultType: 'wrongbook',
  };
}

export function createRealWrongbookAdapter(
  { client = ruoyiClient }: { client?: ApiClient } = {},
): WrongbookAdapter {
  const learningCenter = createRealLearningCenterAdapter({ client });
  return {
    listWrongbook(query) {
      return learningCenter.getHistoryPage(withResultType(query));
    },
  };
}

export function createMockWrongbookAdapter(): WrongbookAdapter {
  const learningCenter = createMockLearningCenterAdapter();
  return {
    async listWrongbook(query) {
      const page = await learningCenter.getHistoryPage(withResultType(query));
      // mock fixtures 里没有 wrongbook 条目，兜底给两条示例让 UI 可演示。
      if (page.rows.length === 0) {
        return {
          total: 2,
          rows: [
            {
              recordId: 'mock-wb-1',
              userId: query.userId,
              resultType: 'wrongbook',
              sourceType: 'quiz',
              sourceTable: 'xm_learning_wrongbook',
              sourceResultId: 'mock-quiz:q1',
              sourceSessionId: 'mock-session',
              displayTitle: '隐函数求导',
              summary: '本题考察隐函数求导，答错点：对 y 求导时漏掉 y\' 系数。',
              status: 'completed',
              detailRef: 'mock-quiz:q1',
              sourceTime: new Date().toISOString(),
              favorite: false,
              favoriteTime: null,
            },
            {
              recordId: 'mock-wb-2',
              userId: query.userId,
              resultType: 'wrongbook',
              sourceType: 'quiz',
              sourceTable: 'xm_learning_wrongbook',
              sourceResultId: 'mock-quiz:q2',
              sourceSessionId: 'mock-session',
              displayTitle: '洛必达法则的适用条件',
              summary: '0/0 或 ∞/∞ 型极限才适用，错答忽略了分母趋于 0 的条件。',
              status: 'completed',
              detailRef: 'mock-quiz:q2',
              sourceTime: new Date().toISOString(),
              favorite: false,
              favoriteTime: null,
            },
          ],
        };
      }
      return page;
    },
  };
}

export function resolveWrongbookAdapter(
  options: ResolveWrongbookAdapterOptions = {},
): WrongbookAdapter {
  const real = createRealWrongbookAdapter({ client: options.client });
  const mock = createMockWrongbookAdapter();

  return pickAdapterImplementation(
    {
      real,
      mock,
    },
    options,
  );
}
