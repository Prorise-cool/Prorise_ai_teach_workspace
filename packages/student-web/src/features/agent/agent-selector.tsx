/**
 * 文件说明：提供视频 / 课堂输入页复用的轻量老师风格下拉选择器。
 */
import { ChevronDown, Sparkles } from 'lucide-react';

import {
  AGENT_CONFIG_PRESETS,
  resolveAgentConfigPreset,
  type AgentStyleKey
} from '@/features/agent/agent-config';
import { cn } from '@/lib/utils';

type AgentSelectorProps = {
  value: AgentStyleKey;
  onChange: (nextValue: AgentStyleKey) => void;
  className?: string;
};

export function AgentSelector({
  value,
  onChange,
  className
}: AgentSelectorProps) {
  const currentPreset = resolveAgentConfigPreset(value);

  return (
    <section
      className={cn(
        'grid gap-4 rounded-[var(--xm-radius-xl)] border border-border bg-background/70 p-4 md:grid-cols-[minmax(0,1fr)_220px]',
        className
      )}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label
            className="text-sm font-semibold text-foreground"
            htmlFor="agent-style-selector"
          >
            老师风格
          </label>
          <p className="text-sm text-muted-foreground">
            风格只影响当前会话的讲解气质与局部提示，不会切换全站主题。
          </p>
        </div>

        <div className="relative">
          <select
            className="w-full appearance-none rounded-[var(--xm-radius-lg)] border border-border bg-card px-4 py-3 pr-10 text-sm font-medium text-foreground shadow-sm transition focus:border-primary/60 focus:outline-none"
            id="agent-style-selector"
            onChange={event => onChange(event.target.value as AgentStyleKey)}
            value={value}
          >
            {AGENT_CONFIG_PRESETS.map(preset => (
              <option key={preset.key} value={preset.key}>
                {preset.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div
        className={cn(
          'rounded-[var(--xm-radius-lg)] border border-border bg-card/90 p-4 shadow-sm',
          currentPreset.accentClassName
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--xm-color-agent-accent-border)] bg-[color:var(--xm-color-agent-accent-soft)] text-lg font-bold text-[color:var(--xm-color-agent-accent)]">
            {currentPreset.avatarLabel}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {currentPreset.displayName}
            </div>
            <div className="text-xs text-muted-foreground">
              默认风格可随时调整
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-[var(--xm-radius-md)] bg-[color:var(--xm-color-agent-accent-soft)]/80 px-3 py-2 text-sm text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 text-[color:var(--xm-color-agent-accent)]" />
          <p className="leading-6">{currentPreset.description}</p>
        </div>
      </div>
    </section>
  );
}
