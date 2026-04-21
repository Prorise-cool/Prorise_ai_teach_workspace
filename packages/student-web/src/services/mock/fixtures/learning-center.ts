/**
 * 文件说明：学习中心（Epic 9）mock fixtures。
 * 用于 /learning /history /favorites 页面在 mock 模式下演示完整状态机。
 */
import type { LearningCenterPage, LearningCenterRecord } from '@/types/learning-center';

function isoTime(offsetMinutes: number) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return date.toISOString();
}

const MOCK_USER_ID = '10001';

const RECORDS: LearningCenterRecord[] = [
  {
    recordId: 'rec_video_1',
    userId: MOCK_USER_ID,
    resultType: 'video',
    sourceType: 'video',
    sourceTable: 'xm_video_task',
    sourceResultId: 'video_20260421093000_ab12cd34',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: '洛必达法则的几何意义推导',
    summary: '风格：风趣老师 ｜ 时长：03:45 ｜ 状态：生成完毕',
    status: 'completed',
    detailRef: 'video_20260421093000_ab12cd34',
    sourceTime: isoTime(-90),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_classroom_1',
    userId: MOCK_USER_ID,
    resultType: 'classroom',
    sourceType: 'classroom',
    sourceTable: 'xm_classroom_task',
    sourceResultId: 'classroom_20260420190000_ef56aa12',
    sourceSessionId: 'classroom_20260420190000_ef56aa12',
    displayTitle: '复合函数链式法则应用',
    summary: '状态：已完成 ｜ 互动页：18 ｜ 总结：已生成',
    status: 'completed',
    detailRef: 'classroom_20260420190000_ef56aa12',
    sourceTime: isoTime(-18 * 60),
    favorite: true,
    favoriteTime: isoTime(-16 * 60),
  },
  {
    recordId: 'rec_companion_1',
    userId: MOCK_USER_ID,
    resultType: 'companion',
    sourceType: 'companion',
    sourceTable: 'xm_companion_log',
    sourceResultId: 'companion_20260420192000_31aa',
    sourceSessionId: 'classroom_20260420190000_ef56aa12',
    displayTitle: '伴学问答：链式法则练习',
    summary: '共 12 轮对话 ｜ 关键点：外层/内层导数',
    status: 'completed',
    detailRef: 'companion_20260420192000_31aa',
    sourceTime: isoTime(-17 * 60),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_evidence_1',
    userId: MOCK_USER_ID,
    resultType: 'evidence',
    sourceType: 'evidence',
    sourceTable: 'xm_evidence_result',
    sourceResultId: 'evidence_20260420192500_99cc',
    sourceSessionId: 'classroom_20260420190000_ef56aa12',
    displayTitle: '依据溯源：链式法则证明片段',
    summary: '引用 2 条资料 ｜ 可信度：高 ｜ 已归档',
    status: 'completed',
    detailRef: 'evidence_20260420192500_99cc',
    sourceTime: isoTime(-16 * 60),
    favorite: true,
    favoriteTime: isoTime(-15 * 60),
  },
  {
    recordId: 'rec_checkpoint_1',
    userId: MOCK_USER_ID,
    resultType: 'checkpoint',
    sourceType: 'learning',
    sourceTable: 'xm_learning_record',
    sourceResultId: 'chk_2b7a9a2f6d9d0d0d0d0d',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: 'Checkpoint：轻量热身',
    summary: '正确 2/3 ｜ 结论：需要补强 ｜ 已沉淀',
    status: 'failed',
    detailRef: 'chk_2b7a9a2f6d9d0d0d0d0d',
    sourceTime: isoTime(-70),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_quiz_1',
    userId: MOCK_USER_ID,
    resultType: 'quiz',
    sourceType: 'learning',
    sourceTable: 'xm_quiz_result',
    sourceResultId: 'quiz_9d0d0d0d0d0d0d0d0d0d',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: 'Quiz：正式测验',
    summary: '得分 80 ｜ 错题 4 ｜ 解析已生成',
    status: 'completed',
    detailRef: 'quiz_9d0d0d0d0d0d0d0d0d0d',
    sourceTime: isoTime(-65),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_wrongbook_1',
    userId: MOCK_USER_ID,
    resultType: 'wrongbook',
    sourceType: 'quiz',
    sourceTable: 'xm_learning_wrongbook',
    sourceResultId: 'quiz_9d0d0d0d0d0d0d0d0d0d:q1',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: '错题本：链式法则（q1）',
    summary: '已沉淀错因摘要，建议复盘后重做 2 轮',
    status: 'completed',
    detailRef: 'quiz_9d0d0d0d0d0d0d0d0d0d:q1',
    sourceTime: isoTime(-62),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_recommendation_1',
    userId: MOCK_USER_ID,
    resultType: 'recommendation',
    sourceType: 'learning',
    sourceTable: 'xm_learning_recommendation',
    sourceResultId: 'quiz_9d0d0d0d0d0d0d0d0d0d:rec',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: '学习推荐：下一步建议',
    summary: '先回看错题对应知识点，再完成一次 5 题小测巩固',
    status: 'completed',
    detailRef: 'quiz_9d0d0d0d0d0d0d0d0d0d:rec',
    sourceTime: isoTime(-60),
    favorite: false,
    favoriteTime: null,
  },
  {
    recordId: 'rec_path_1',
    userId: MOCK_USER_ID,
    resultType: 'path',
    sourceType: 'learning',
    sourceTable: 'xm_learning_path',
    sourceResultId: 'path_0d0d0d0d0d0d0d0d0d0d',
    sourceSessionId: 'video_20260421093000_ab12cd34',
    displayTitle: '学习路径：7 天学习路径',
    summary: '3 阶段 ｜ 行动项 6 ｜ 已保存',
    status: 'completed',
    detailRef: 'path_0d0d0d0d0d0d0d0d0d0d',
    sourceTime: isoTime(-45),
    favorite: false,
    favoriteTime: null,
  },
];

function buildPage(rows: LearningCenterRecord[]): LearningCenterPage {
  return {
    total: rows.length,
    rows,
    code: 200,
    msg: '查询成功',
  };
}

export const learningCenterMockFixtures = {
  learning: {
    success: buildPage(RECORDS.slice(0, 6)),
    empty: buildPage([]),
  },
  history: {
    success: buildPage(RECORDS),
    empty: buildPage([]),
  },
  favorites: {
    success: buildPage(RECORDS.filter((record) => record.favorite)),
    empty: buildPage([]),
  },
} as const;

