/**
 * 智能体发言气泡 —— 1:1 移植自 OpenMAIC 圆桌气泡布局。
 *
 * 视觉要点：
 *   - 气泡：`rounded-2xl border border-border bg-card p-3 text-sm shadow-sm`
 *   - 头像 ring：用 boxShadow inline 注入 agent.color（动态颜色无法用 Tailwind 类）
 *   - 听众头像组：`-space-x-2`，每个头像 `ring-2 ring-card`（镶嵌视觉）
 *
 * Props 接口严格保持不变（Team 2 的 stage-bottom-bar / stage.tsx 都在 import）。
 */
import type { CSSProperties, FC } from 'react';

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

  // 颜色 ring：用 inline boxShadow 模拟 `ring-2 ring-offset-2 ring-offset-card ring-[agent.color]`
  const avatarRingStyle: CSSProperties = {
    boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${agent.color}`,
    borderRadius: '9999px',
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* 头像 + 名字 */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div style={avatarRingStyle}>
          <AgentAvatar
            name={agent.name}
            color={agent.color}
            avatar={agent.avatar}
            size="lg"
            showOnlineIndicator
          />
        </div>
        <span
          className="text-[10px] font-bold"
          style={{ color: agent.color }}
        >
          {displayName}
        </span>
      </div>

      {/* 气泡 */}
      <div className="relative flex-1 rounded-2xl border border-border bg-card p-3 text-sm text-foreground shadow-sm">
        {text}
        {isStreaming && (
          <span className="ml-1 inline-flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.16s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.32s]" />
          </span>
        )}
      </div>

      {/* 听众头像组（OpenMAIC 风格：水平镶嵌，ring-2 ring-card） */}
      {listeners.length > 0 && (
        <div className="hidden md:flex flex-col items-center gap-1 border-l border-border pl-3">
          <div className="flex items-center -space-x-2">
            {listeners.slice(0, 3).map((l) => (
              <div key={l.id} className="rounded-full ring-2 ring-card">
                <AgentAvatar name={l.name} color={l.color} size="sm" />
              </div>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{t('classroom.common.audience')}</span>
        </div>
      )}
    </div>
  );
};
