/**
 * 文件说明：统一的 404 兜底页。
 *
 * Wave 2 Polish：react-router 的 RenderErrorBoundary 是独立机制，不经过 React
 * error boundary（AppShell 外的 ErrorBoundary）。本页挂在路由表 `path: '*'`
 * catch-all 上，确保任何未匹配 URL 走品牌化 EmptyState 兜底。
 *
 * 视觉对齐其他 EmptyState fallback（如 classroom-play missing）：整页居中 +
 * 图标 + 标题 + 描述 +回首页按钮。不做浮夸动画。
 */
import { Compass } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';

/**
 * 渲染 404 兜底页。
 *
 * @returns 404 页节点。
 */
export function NotFoundPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <EmptyState
        icon={<Compass className="h-8 w-8" />}
        title={t('notFound.title')}
        description={t('notFound.description', { path: location.pathname })}
        action={
          <Button onClick={() => void navigate('/')} variant="outline">
            {t('notFound.backHome')}
          </Button>
        }
      />
    </div>
  );
}
