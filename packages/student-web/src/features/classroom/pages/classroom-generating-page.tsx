/**
 * 文件说明：课堂生成等待路由页。
 * 通过 URL `/classroom/generating/:taskId` 承接 `classroom-input-page` 提交后的任务，
 * 内部启动轮询 → 完成后自动跳转 `/classroom/play/:classroomId`。
 */
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { TaskGeneratingShell, useSyntheticLogs } from '@/components/generating';
import { usePollGeneration } from '@/features/classroom/hooks/use-classroom';

export function ClassroomGeneratingPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const poll = usePollGeneration(taskId);
  const { status, progress, stageLabel, classroomId, errorMessage } = poll;

  const logs = useSyntheticLogs(stageLabel, progress, {
    status,
    completedLabel: t('classroom.generating.stageCompleted'),
    failedLabel: t('classroom.generating.stageFailed'),
  });

  const tips = useMemo(
    () => [
      t('classroom.generating.tip1'),
      t('classroom.generating.tip2'),
      t('classroom.generating.tip3'),
    ],
    [t],
  );

  useEffect(() => {
    if (status !== 'completed' || !classroomId) return;
    const timer = setTimeout(() => {
      void navigate(`/classroom/play/${classroomId}`, { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [status, classroomId, navigate]);

  const handleReturn = () => {
    poll.cancel();
    void navigate('/classroom/input');
  };

  if (!taskId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <EmptyState
          title={t('classroom.generating.failedTitle')}
          description={t('classroom.common.classroomGenerationFailed')}
          action={
            <Button variant="outline" size="sm" onClick={handleReturn}>
              {t('classroom.generating.returnLabel')}
            </Button>
          }
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <EmptyState
          title={t('classroom.generating.failedTitle')}
          description={errorMessage ?? t('classroom.common.classroomGenerationFailed')}
          action={
            <Button variant="outline" size="sm" onClick={handleReturn}>
              {t('classroom.generating.failedRetry')}
            </Button>
          }
        />
      </div>
    );
  }

  const etaText = progress < 40 ? t('classroom.generating.etaShort') : t('classroom.generating.etaLong');

  return (
    <TaskGeneratingShell
      title={t('classroom.generating.pageTitle')}
      progress={progress}
      stageLabel={stageLabel || t('classroom.generating.stageOutline')}
      logs={logs}
      status={status}
      etaText={etaText}
      tipsRotation={tips}
      onCancel={handleReturn}
      cancelLabel={t('classroom.generating.cancelLabel')}
      returnLabel={t('classroom.generating.returnLabel')}
      onReturn={handleReturn}
      colorScheme="indigo"
    />
  );
}
