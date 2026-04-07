/**
 * 文件说明：提供视频输入页公开视频发现区的 mock fixture。
 * 同时兼容 Story 3.6 当前 `video/public` 形态与 Epic 4 `video/published` 列表形态。
 */
import type {
  VideoPublicListEnvelope,
  VideoPublicListQuery,
  VideoPublicMockScenario,
} from '@/types/video';
import { readNumber, readRecord, readString } from '@/lib/type-guards';

const FIXTURE_CREATED_AT = '2026-04-06T11:20:00Z';

type VideoPublicFixtureError = {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
};

type PublishedVideoListEnvelope = {
  code: number;
  msg: string;
  data: {
    items: Array<{
      resultId: string;
      title: string;
      summary: string;
      knowledgePoints: string[];
      coverUrl: string | null;
      duration: string;
      publishedAt: string;
      authorName: string;
      authorAvatar?: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
};

const baseItems: VideoPublicListEnvelope['data']['items'] = [
  {
    videoId: 'video_public_lhopital',
    title: '洛必达法则的完整推导',
    summary: '从柯西中值定理出发，逐步推导洛必达法则，配合 Manim 动画演示极限过程。',
    thumbnail: '/entry/roboto.png',
    duration: '05:32',
    viewCount: 1247,
    createdAt: FIXTURE_CREATED_AT,
    sourceText: '请证明洛必达法则为什么成立，并给出完整推导过程。',
    authorName: '林嘉琪',
    authorAvatar: '/entry/teacher-humorous.jpg',
    knowledgePoints: ['极限', '柯西中值定理', '洛必达法则'],
  },
  {
    videoId: 'video_public_partial',
    title: '偏导数方程的几何意义',
    summary: '通过曲面切片与梯度方向，直观解释偏导数方程在几何空间中的含义。',
    thumbnail: null,
    duration: '04:18',
    viewCount: 893,
    createdAt: '2026-04-05T09:15:00Z',
    sourceText: '解释偏导数方程的几何意义，并结合曲面示意图说明。',
    authorName: '陈老师',
    knowledgePoints: ['偏导数', '梯度', '曲面'],
  },
  {
    videoId: 'video_public_fourier',
    title: '傅里叶变换直觉解释',
    summary: '用声波和频谱的类比，帮你在 5 分钟内理解傅里叶变换的核心思想。',
    thumbnail: '/entry/runner.png',
    duration: '06:05',
    viewCount: 2106,
    createdAt: '2026-04-04T08:45:00Z',
    sourceText: '请用直觉化的方式解释傅里叶变换，并给出频谱示意。',
    authorName: 'Ava Li',
    authorAvatar: '/entry/teacher-patient.jpg',
    knowledgePoints: ['傅里叶变换', '频域', '时域'],
  },
  {
    videoId: 'video_public_taylor',
    title: '泰勒展开的收敛半径',
    summary: '通过系数增长与奇点位置的关系，理解泰勒展开的收敛半径。',
    thumbnail: null,
    duration: '03:49',
    viewCount: 567,
    createdAt: '2026-04-03T16:00:00Z',
    sourceText: '请解释泰勒展开的收敛半径，并说明如何判断。',
    authorName: '何文涛',
    knowledgePoints: ['泰勒展开', '收敛半径'],
  },
  {
    videoId: 'video_public_polar',
    title: '二重积分的极坐标变换',
    summary: '通过积分区域动画，展示直角坐标系到极坐标系的变换过程。',
    thumbnail: '/entry/pacheco.png',
    duration: '05:11',
    viewCount: 1534,
    createdAt: '2026-04-02T10:30:00Z',
    sourceText: '请讲解二重积分如何进行极坐标变换，并演示积分区域变化。',
    authorName: '黄教研员',
    authorAvatar: '/entry/teacher-serious.jpg',
    knowledgePoints: ['二重积分', '极坐标'],
  },
  {
    videoId: 'video_public_eigen',
    title: '矩阵特征值分解的实际应用',
    summary: '结合 PCA 与系统稳定性示例，讲清特征值分解的直观意义。',
    thumbnail: null,
    duration: '04:42',
    viewCount: 432,
    createdAt: '2026-04-01T14:12:00Z',
    sourceText: '结合实际应用解释矩阵特征值分解的意义，并给出例子。',
    authorName: 'Sophia Zhou',
    knowledgePoints: ['矩阵', '特征值分解', 'PCA'],
  },
];

/** 公开视频列表 fixture 集合。 */
export const videoPublicMockFixtures = {
  success: {
    default: {
      code: 200,
      msg: '获取公开视频列表成功',
      data: {
        items: baseItems,
        total: baseItems.length,
        page: 1,
        pageSize: 12,
      },
    } satisfies VideoPublicListEnvelope,
    empty: {
      code: 200,
      msg: '获取公开视频列表成功',
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
      },
    } satisfies VideoPublicListEnvelope,
  },
  errors: {
    unavailable: {
      status: 503,
      code: 'VIDEO_PUBLIC_FEED_UNAVAILABLE',
      message: '公开视频暂时不可用',
      details: {
        reason: 'upstream timeout',
      },
    } satisfies VideoPublicFixtureError,
  },
} as const;

/**
 * 按查询参数切片并排序公开视频列表。
 *
 * @param query - 查询参数。
 * @returns 分页后的列表数据。
 */
function sliceItems(
  query: Partial<VideoPublicListQuery> = {},
): VideoPublicListEnvelope['data'] {
  const page = Number.isFinite(query.page) ? Number(query.page) : 1;
  const pageSize = Number.isFinite(query.pageSize) ? Number(query.pageSize) : 12;
  const sort = query.sort ?? 'latest';
  const sortedItems = [...baseItems].sort((left, right) => {
    if (sort === 'popular') {
      return right.viewCount - left.viewCount;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
  const start = Math.max(page - 1, 0) * pageSize;
  const end = start + pageSize;

  return {
    items: sortedItems.slice(start, end),
    total: sortedItems.length,
    page,
    pageSize,
  };
}

/**
 * 获取 Story 3.6 使用的公开视频列表成功响应。
 *
 * @param scenario - mock 场景。
 * @param query - 查询参数。
 * @returns 当前 Story 对外响应包。
 */
export function getMockVideoPublicListSuccess(
  scenario: Extract<VideoPublicMockScenario, 'default' | 'empty'> = 'default',
  query: Partial<VideoPublicListQuery> = {},
): VideoPublicListEnvelope {
  if (scenario === 'empty') {
    return {
      ...videoPublicMockFixtures.success.empty,
      data: {
        ...videoPublicMockFixtures.success.empty.data,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 12,
      },
    };
  }

  return {
    ...videoPublicMockFixtures.success.default,
    data: sliceItems(query),
  };
}

/**
 * 获取 Epic 4 published list 兼容响应。
 *
 * @param query - 查询参数。
 * @returns `video/published` 形态响应包。
 */
export function getMockPublishedVideoListSuccess(
  query: Partial<VideoPublicListQuery> = {},
): PublishedVideoListEnvelope {
  const sliced = sliceItems(query);

  return {
    code: 200,
    msg: '获取公开视频列表成功',
    data: {
      items: sliced.items.map((item) => ({
        resultId: item.videoId,
        title: item.title,
        summary: item.summary,
        knowledgePoints: item.knowledgePoints ?? [],
        coverUrl: item.thumbnail,
        duration: item.duration,
        publishedAt: item.createdAt,
        authorName: item.authorName,
        authorAvatar: item.authorAvatar,
      })),
      total: sliced.total,
      page: sliced.page,
      pageSize: sliced.pageSize,
    },
  };
}

/**
 * 根据 mock 场景返回错误信息。
 *
 * @param scenario - mock 场景。
 * @returns 错误对象或 null。
 */
export function getVideoPublicFixtureError(
  scenario: VideoPublicMockScenario | undefined,
): VideoPublicFixtureError | null {
  if (scenario === 'error') {
    return videoPublicMockFixtures.errors.unavailable;
  }

  return null;
}

/**
 * 规范化公开视频 mock 错误对象。
 *
 * @param error - 原始错误。
 * @returns 规范化错误。
 */
export function normalizeMockVideoPublicError(
  error: unknown,
): VideoPublicFixtureError {
  const candidate = readRecord(error);

  if (candidate) {
    const status = readNumber(candidate.status);
    const code = readString(candidate.code);
    const message = readString(candidate.message);
    const details = readRecord(candidate.details);

    if (
      status !== undefined &&
      code !== undefined &&
      message !== undefined &&
      details
    ) {
      return { status, code, message, details };
    }
  }

  return {
    status: 500,
    code: 'VIDEO_PUBLIC_FEED_UNKNOWN',
    message:
      error instanceof Error ? error.message : '未知公开视频 mock 错误',
    details: {},
  };
}
