/**
 * 项目制学习（PBL）场景渲染器（对齐后端真实 shape）。
 *
 * 后端 scene.content = {
 *   projectTitle: "项目名称",
 *   projectOverview: "项目概述",
 *   issues: [{ id, title, description, assigneeRole?: "student"|"teacher"|"assistant" }]
 * }
 */
import type { FC } from 'react';
import { GraduationCap, User, Users } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

interface PBLIssue {
  id: string;
  title: string;
  description: string;
  assigneeRole?: string;
}

interface PBLContent {
  projectTitle?: string;
  projectOverview?: string;
  issues?: PBLIssue[];
}

interface PBLRendererProps {
  content: PBLContent;
  sceneTitle: string;
  sceneOrder: number;
}

const roleIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  student: User,
  teacher: GraduationCap,
  assistant: Users,
};

const roleLabelKey: Record<string, string> = {
  student: 'student',
  teacher: 'teacher',
  assistant: 'assistant',
};

export const PBLRenderer: FC<PBLRendererProps> = ({ content, sceneTitle, sceneOrder }) => {
  const { t } = useAppTranslation();
  const title = content?.projectTitle ?? sceneTitle;
  const overview = content?.projectOverview ?? '';
  const issues = content?.issues ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · PROJECT
        </span>
      </div>

      <div className="flex-1 space-y-5 px-5 py-5">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
          {overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">{overview}</p>
          )}
        </div>

        {issues.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('classroom.sceneRenderer.projectTasksLabel')} · {issues.length}
            </h3>
            <div className="space-y-3">
              {issues.map((issue, i) => {
                const Icon = issue.assigneeRole ? roleIcon[issue.assigneeRole] ?? User : User;
                const labelKey = issue.assigneeRole
                  ? roleLabelKey[issue.assigneeRole]
                  : 'student';
                const label = labelKey
                  ? t(`classroom.common.${labelKey}`)
                  : issue.assigneeRole ?? t('classroom.common.student');
                return (
                  <div
                    key={issue.id}
                    className="group rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{issue.title}</h4>
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
