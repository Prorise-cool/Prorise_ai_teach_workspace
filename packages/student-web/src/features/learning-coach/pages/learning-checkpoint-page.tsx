/**
 * Learning Coach Checkpoint 独立页面（Epic 8 / Story 8.2）。
 *
 * 与 `learning-quiz-page.tsx` 分别作为两个独立 page 骨架，分别挂到
 * `/checkpoint/:sessionId` 和 `/quiz/:sessionId` 两条路由，满足 Story 8.2
 * 「不得把 checkpoint / quiz 压回同一个不可区分的单页面状态机」的约束。
 *
 * 底层视图目前复用 `learning-assessment-page.tsx` 中的测评 UI；后续 Story
 * 如需进一步分化 checkpoint 的视觉或交互，可直接在本文件中替换为独立实现，
 * 不影响路由层与 quiz 侧。
 */
import { LearningAssessmentPage } from './learning-assessment-page';

export function LearningCheckpointPage() {
  return <LearningAssessmentPage mode="checkpoint" />;
}
