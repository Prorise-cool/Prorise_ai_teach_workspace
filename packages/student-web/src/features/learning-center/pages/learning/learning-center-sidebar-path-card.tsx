import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

// TODO(epic-9): 当前卡片展示的标题 (pathFallbackTitleLine1/2 "微积分求导/进阶攻坚")
// 是 i18n 占位文案，不是当前用户活跃路径。进度 0/0 也因为 LearningPathPlanPayload
// 还没有 completedStepCount / totalStepCount 字段，统一展示 0% 避免误导。
// 后续 Story 应从 xm_learning_path 按 user_id 最新一条拉取 path_title + 真实进度字段。
const COMPLETED_STEP_COUNT = 0;
const TOTAL_STEP_COUNT = 0;

export function LearningCenterSidebarPathCard() {
  const { t } = useAppTranslation();

  const progressPercent =
    TOTAL_STEP_COUNT > 0
      ? Math.round((COMPLETED_STEP_COUNT / TOTAL_STEP_COUNT) * 100)
      : 0;
  const progressRatio = `${COMPLETED_STEP_COUNT}/${TOTAL_STEP_COUNT}`;

  return (
    <Link
      to="/history?resultType=path"
      className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow relative overflow-hidden block shadow-md"
    >
      <div className="absolute -right-6 -top-6 opacity-[0.08]">
        <Compass className="w-32 h-32 text-surface-light dark:text-brand" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-light/70 dark:text-text-secondary-dark">
            {t('learningCenter.page.currentPathSectionTitle')}
          </h2>
          <span className="text-[10px] font-bold bg-brand text-primary-foreground px-2 py-0.5 rounded shadow-sm">
            {t('learningCenter.page.currentPathTargetBadge')}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-8 tracking-tight">
          {t('learningCenter.page.pathFallbackTitleLine1')}
          <br />
          {t('learningCenter.page.pathFallbackTitleLine2')}
        </h3>
        <div className="flex justify-between text-xs font-bold mb-3 text-surface-light/80 dark:text-text-secondary-dark">
          <span>{t('learningCenter.page.pathProgressLabel')}</span>
          <span>{progressPercent}% ({progressRatio})</span>
        </div>
        <div className="w-full h-1.5 bg-text-secondary dark:bg-bg-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

