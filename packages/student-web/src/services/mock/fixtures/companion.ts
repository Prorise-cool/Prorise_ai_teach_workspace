/**
 * Companion 智能侧栏 mock fixture。
 * Story 6.2：提供 bootstrap 和 ask 的场景驱动 mock 数据。
 */
import type {
  CompanionAnchor,
  CompanionAskRequest,
  CompanionAskResponse,
  CompanionBootstrapResponse,
  CompanionMockScenario,
} from '@/types/companion';

/* ---------- Bootstrap fixtures ---------- */

function createBootstrapFixture(
  taskId: string,
  overrides?: Partial<CompanionBootstrapResponse>,
): CompanionBootstrapResponse {
  return {
    taskId,
    sessionId: `comp_sess_${taskId}`,
    contextSource: 'redis',
    knowledgePoints: ['导数定义', '极限', '切线斜率', '平均变化率'],
    topicSummary: '从瞬时速度的生活直觉出发，经过割线斜率与极限，最终收敛到导数定义。',
    ...overrides,
  };
}

const BOOTSTRAP_FIXTURES: Record<string, CompanionBootstrapResponse> = {
  degraded: createBootstrapFixture('task_degraded', {
    contextSource: 'degraded',
    knowledgePoints: [],
    topicSummary: '上下文暂时不可用，请稍后再试。',
  }),
};

/**
 * 获取 bootstrap mock 数据。
 */
export function getCompanionBootstrapFixture(
  taskId: string,
): CompanionBootstrapResponse {
  if (taskId.includes('degraded') || taskId.includes('fail')) {
    return BOOTSTRAP_FIXTURES.degraded;
  }

  return createBootstrapFixture(taskId);
}

/* ---------- Ask fixtures ---------- */

const ANCHOR: CompanionAnchor = {
  taskId: 'task_mock',
  seconds: 135,
  sectionTitle: '积分概念',
};

function createAskFixture(
  overrides: Partial<CompanionAskResponse>,
): CompanionAskResponse {
  return {
    turnId: 'turn_mock_001',
    answerText: '好问题！这正是微积分的魅力。',
    anchor: ANCHOR,
    whiteboardActions: [],
    sourceRefs: [],
    persistenceStatus: 'complete_success',
    contextSourceHit: 'redis',
    ...overrides,
  };
}

const ASK_FIXTURES: Record<
  CompanionMockScenario,
  (req: CompanionAskRequest) => CompanionAskResponse
> = {
  first_ask: (req) =>
    createAskFixture({
      turnId: `turn_${Date.now()}`,
      answerText:
        '好问题！积分等于面积的核心在于"无限细分后求和"。你可以把不规则曲线下的面积想象成无数个极细的矩形拼接而成。每个矩形的宽度是无限小的 dx，高度是函数值 f(x)。当矩形数量趋于无穷，宽度和就变成了精确的定积分。',
      anchor: req.anchor,
    }),

  follow_up: (req) =>
    createAskFixture({
      turnId: `turn_${Date.now()}`,
      answerText:
        '你之前问过积分与面积的关系，现在更进一步：黎曼和就是对有限个矩形求和的中间步骤。当分割越来越细，上和与下和的差趋近于零时，极限就是定积分的值。',
      anchor: req.anchor,
      persistenceStatus: 'complete_success',
    }),

  whiteboard_success: (req) =>
    createAskFixture({
      turnId: `turn_wb_${Date.now()}`,
      answerText:
        '让我用画板给你演示一下。看图中蓝色区域——那就是积分对应的面积。当 dx→0 时，所有小矩形面积之和就是定积分。',
      anchor: req.anchor,
      whiteboardActions: [
        {
          actionType: 'draw_function',
          payload: { expression: 'y = x^2', color: '#3b82f6' },
          renderUri: '/renders/integral_demo.png',
        },
        {
          actionType: 'highlight_region',
          payload: { xMin: 0, xMax: 2, color: 'rgba(59,130,246,0.2)' },
        },
      ],
    }),

  whiteboard_degraded: (req) =>
    createAskFixture({
      turnId: `turn_wbdeg_${Date.now()}`,
      answerText:
        '白板渲染暂时不可用，我用文字说明：积分的核心是"分割→近似→求和→取极限"四步。1) 将区间 [a,b] 分成 n 份；2) 每份取一个代表点 ξᵢ；3) 求和 Σf(ξᵢ)Δxᵢ；4) 令 max(Δxᵢ)→0 取极限。',
      anchor: req.anchor,
      persistenceStatus: 'whiteboard_degraded',
      whiteboardActions: [],
    }),

  no_context_degraded: (req) =>
    createAskFixture({
      turnId: `turn_deg_${Date.now()}`,
      answerText:
        '暂时无法获取当前视频的上下文信息。请稍后再试，或尝试重新进入视频播放页面。',
      anchor: req.anchor,
      persistenceStatus: 'reference_missing',
      contextSourceHit: 'degraded',
    }),

  service_error: (req) =>
    createAskFixture({
      turnId: `turn_err_${Date.now()}`,
      answerText: '',
      anchor: req.anchor,
      persistenceStatus: 'overall_failure',
    }),
};

/**
 * 获取 ask mock 数据。
 */
export function getCompanionAskFixture(
  scenario: CompanionMockScenario,
  request: CompanionAskRequest,
): CompanionAskResponse {
  const factory = ASK_FIXTURES[scenario] ?? ASK_FIXTURES.first_ask;
  const fixture = factory(request);

  return {
    ...fixture,
    anchor: request.anchor,
  };
}

/** 导出 fixture 集合供测试引用。 */
export const companionMockFixtures = {
  askFactories: ASK_FIXTURES,
} as const;
