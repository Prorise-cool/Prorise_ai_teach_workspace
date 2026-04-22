/**
 * 文件说明：视频结果页顶部 Header 组件。
 * 含返回箭头、标题、发布状态胶囊、侧栏控制（对齐设计稿）。
 */
import {
  ChevronLeft,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Shield,
} from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

export interface ResultHeaderProps {
  /** 视频标题。 */
  title?: string;
  /** 任务 ID（用于复用题目跳转）。 */
  taskId?: string;
  /** 是否已公开发布。 */
  published?: boolean;
  /** 发布操作进行中。 */
  publishLoading?: boolean;
  /** 点击公开发布。 */
  onPublish?: () => void;
  /** 点击取消公开（已发布时）。 */
  onUnpublish?: () => void;
  /** 侧栏是否展开。 */
  sidebarOpen: boolean;
  /** 切换侧栏。 */
  onToggleSidebar: () => void;
  /** 额外 className。 */
  className?: string;
  /** 是否只读公开视图。 */
  readOnly?: boolean;
  /** 返回目标路径；不传则走 history.back()。 */
  backTo?: string | null;
  /** Learning Coach 会话后入口路径（Epic 8）。 */
  learningCoachTo?: string | null;
}

/**
 * 渲染结果页顶部极简 Header。
 *
 * @param props - Header 属性。
 * @returns Header UI。
 */
export function ResultHeader({
  title,
  taskId,
  published = false,
  publishLoading = false,
  onPublish,
  onUnpublish,
  sidebarOpen,
  onToggleSidebar,
  className,
  readOnly = false,
  backTo = '/video/input',
  learningCoachTo = null,
}: ResultHeaderProps) {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const handleReturn = useCallback(() => {
    if (backTo) {
      void navigate(backTo);
      return;
    }

    void navigate(-1);
  }, [backTo, navigate]);

  const handleReuse = useCallback(() => {
    if (taskId) {
      void navigate(`/video/input?reuseTaskId=${taskId}`);
    }
  }, [navigate, taskId]);

  const handleLearningCoach = useCallback(() => {
    if (learningCoachTo) {
      void navigate(learningCoachTo);
    }
  }, [learningCoachTo, navigate]);

  return (
    <header className={cn('xm-result-header', className)}>
      <div className="xm-result-header__left">
        <button
          onClick={handleReturn}
          className="xm-result-header__back"
          aria-label={t('video.common.returnLabel')}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {title && (
          <h1 className="xm-result-header__title">{title}</h1>
        )}
      </div>

      <div className="xm-result-header__right">
        {!readOnly && learningCoachTo ? (
          <button
            className="xm-result-header__action-btn xm-result-header__action-btn--outline"
            onClick={handleLearningCoach}
          >
            {t('video.result.learningCoachAction')}
          </button>
        ) : null}

        {/* 发布状态胶囊 — xl 以上显示 */}
        <div className="xm-result-header__publish-capsule">
          <span className="xm-result-header__status-badge">
            <Shield className="w-3.5 h-3.5" />
            {published
              ? t('video.result.statusPublished')
              : t('video.result.statusPrivate')}
          </span>
          {!readOnly && !published && (
            <button
              className="xm-result-header__action-btn xm-result-header__action-btn--primary"
              onClick={onPublish}
              disabled={publishLoading}
            >
              {publishLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('video.result.publishAction')}
            </button>
          )}
          {!readOnly && published && onUnpublish && (
            <button
              className="xm-result-header__action-btn xm-result-header__action-btn--outline"
              onClick={onUnpublish}
              disabled={publishLoading}
            >
              {publishLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('video.result.unpublishAction')}
            </button>
          )}
          {!readOnly ? (
            <button
              className="xm-result-header__action-btn xm-result-header__action-btn--outline"
              onClick={handleReuse}
            >
              {t('video.result.reuseAction')}
            </button>
          ) : null}
        </div>

        <button
          className="xm-result-header__icon-btn"
          onClick={onToggleSidebar}
          title={t('video.result.toggleSidebar')}
        >
          {sidebarOpen ? (
            <PanelRightClose className="w-5 h-5" />
          ) : (
            <PanelRightOpen className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
