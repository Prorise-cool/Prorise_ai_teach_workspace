/**
 * 圆桌讨论组件。
 * 展示多智能体讨论进行中的状态。
 */
import { Loader2 } from 'lucide-react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { AgentProfile } from '../../types/agent';
import { AgentAvatar } from '../agent/agent-avatar';

interface RoundtableProps {
  agents: AgentProfile[];
  activeAgentId: string | null;
  topic: string;
  isActive: boolean;
}

export const Roundtable: FC<RoundtableProps> = ({ agents, activeAgentId, topic, isActive }) => {
  const { t } = useAppTranslation();
  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-bold text-foreground">{t('classroom.chat.roundtable')}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{topic}</p>

      <div className="flex items-center gap-2">
        {agents.map((agent) => {
          const isActive = agent.id === activeAgentId;
          return (
            <div
              key={agent.id}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? 'scale-110' : 'opacity-60'
              }`}
            >
              <AgentAvatar
                name={agent.name}
                color={agent.color}
                avatar={agent.avatar}
                size="sm"
                showOnlineIndicator={isActive}
              />
              <span className="text-[9px] text-muted-foreground">{agent.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
