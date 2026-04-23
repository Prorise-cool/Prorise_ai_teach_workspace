/**
 * 智能体信息栏组件。
 * 显示当前发言智能体与听众组。
 */
import type { FC } from 'react';

import type { AgentProfile } from '../../types/agent';
import { AgentAvatar } from './agent-avatar';

interface AgentBarProps {
  currentAgent: AgentProfile | null;
  listeners: AgentProfile[];
  isLive?: boolean;
}

export const AgentBar: FC<AgentBarProps> = ({ currentAgent, listeners, isLive = false }) => {
  if (!currentAgent) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-2">
        <AgentAvatar
          name={currentAgent.name}
          color={currentAgent.color}
          avatar={currentAgent.avatar}
          size="md"
          showOnlineIndicator={isLive}
        />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground">{currentAgent.name}</span>
          <span className="text-[10px] text-muted-foreground">{currentAgent.role}</span>
        </div>
        {isLive && (
          <span className="ml-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
            LIVE
          </span>
        )}
      </div>

      {listeners.length > 0 && (
        <div className="ml-auto flex items-center gap-1.5 border-l border-border pl-3">
          <div className="flex -space-x-2">
            {listeners.slice(0, 3).map((agent) => (
              <AgentAvatar
                key={agent.id}
                name={agent.name}
                color={agent.color}
                avatar={agent.avatar}
                size="sm"
              />
            ))}
          </div>
          {listeners.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{listeners.length - 3}</span>
          )}
          <span className="text-[10px] text-muted-foreground">听众</span>
        </div>
      )}
    </div>
  );
};
