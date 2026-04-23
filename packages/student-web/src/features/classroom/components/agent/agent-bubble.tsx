/**
 * 智能体发言气泡组件。
 * 包含头像 + 带尾巴的气泡文本。
 */
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { AgentProfile } from '../../types/agent';
import { AgentAvatar } from './agent-avatar';

interface AgentBubbleProps {
  agent: AgentProfile;
  text: string;
  listeners?: AgentProfile[];
  isStreaming?: boolean;
}

export const AgentBubble: FC<AgentBubbleProps> = ({
  agent,
  text,
  listeners = [],
  isStreaming = false,
}) => {
  const { t } = useAppTranslation();
  // 主讲教师（中/英两种可能的 role 字面量）统一显示 Teacher 徽标；
  // 其他 agent 显示本名。
  const teacherRoles = [
    t('classroom.common.headTeacher'),
    '主讲教师',
    'Lead Teacher',
  ];
  const displayName = teacherRoles.includes(agent.role) ? 'Teacher' : agent.name;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* 头像 */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <AgentAvatar
          name={agent.name}
          color={agent.color}
          avatar={agent.avatar}
          size="lg"
          showOnlineIndicator
        />
        <span
          className="text-[10px] font-bold"
          style={{ color: agent.color }}
        >
          {displayName}
        </span>
      </div>

      {/* 气泡 */}
      <div className="relative flex-1 rounded-xl border border-border bg-card p-3 text-[13px] leading-relaxed text-foreground shadow-sm">
        {/* 气泡尾巴 */}
        <span
          className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-border bg-card"
          aria-hidden="true"
        />
        {text}
        {isStreaming && (
          <span className="ml-1 inline-flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.16s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.32s]" />
          </span>
        )}
      </div>

      {/* 听众头像组 */}
      {listeners.length > 0 && (
        <div className="hidden flex-col items-center gap-1 border-l border-border pl-3 sm:flex">
          <div className="flex flex-col -space-y-2">
            {listeners.slice(0, 3).map((l) => (
              <AgentAvatar key={l.id} name={l.name} color={l.color} size="sm" />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{t('classroom.common.audience')}</span>
        </div>
      )}
    </div>
  );
};
