/**
 * Learning Coach 正式 Quiz 独立页面（Epic 8 / Story 8.2）。
 *
 * 与 `learning-checkpoint-page.tsx` 成对存在，分别挂到
 * `/quiz/:sessionId` 和 `/checkpoint/:sessionId` 两条路由，对外表现为
 * 两套独立 page 骨架；Story 8.2 明文禁止把两者压回单页面状态机。
 *
 * 底层视图目前复用 `learning-assessment-page.tsx` 中的测评 UI；后续 Story
 * 如需为 quiz 单独定制解析面板 / 解题时间线等差异化体验，可在本文件中
 * 独立替换实现，不影响 checkpoint 侧。
 */
import { LearningAssessmentPage } from './learning-assessment-page';

export function LearningQuizPage() {
  return <LearningAssessmentPage mode="quiz" />;
}
