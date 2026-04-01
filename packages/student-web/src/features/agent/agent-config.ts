/**
 * 文件说明：固化 Story 1.5 所需的老师风格预设与透传字段语义。
 */

export const AGENT_STYLE_KEYS = [
  'serious',
  'humorous',
  'patient',
  'efficient'
] as const;

export type AgentStyleKey = (typeof AGENT_STYLE_KEYS)[number];

export type AgentConfigPreset = {
  key: AgentStyleKey;
  displayName: string;
  shortLabel: string;
  tone: string;
  accentClassName: string;
  accentHex: string;
  avatarLabel: string;
  description: string;
};

export type AgentConfigPayload = {
  key: AgentStyleKey;
  displayName: string;
  tone: string;
  accentHex: string;
  avatarLabel: string;
};

export const DEFAULT_AGENT_STYLE_KEY: AgentStyleKey = 'patient';

/** Epic 1 冻结的 4 种老师风格。 */
export const AGENT_CONFIG_PRESETS: readonly AgentConfigPreset[] = [
  {
    key: 'serious',
    displayName: '严肃型老师',
    shortLabel: '严肃',
    tone: 'rigorous',
    accentClassName: 'agent-accent-serious',
    accentHex: '#4a6fa5',
    avatarLabel: 'S',
    description: '结构清晰，适合考前冲刺、公式推导和正式课堂节奏。'
  },
  {
    key: 'humorous',
    displayName: '幽默型老师',
    shortLabel: '幽默',
    tone: 'playful',
    accentClassName: 'agent-accent-humorous',
    accentHex: '#ff9500',
    avatarLabel: 'H',
    description: '类比丰富，适合第一次接触知识点或需要提起兴趣时使用。'
  },
  {
    key: 'patient',
    displayName: '耐心型老师',
    shortLabel: '耐心',
    tone: 'calm',
    accentClassName: 'agent-accent-patient',
    accentHex: '#52c41a',
    avatarLabel: 'P',
    description: '步骤更细，适合基础薄弱、难点攻克和慢节奏理解。'
  },
  {
    key: 'efficient',
    displayName: '高效型老师',
    shortLabel: '高效',
    tone: 'direct',
    accentClassName: 'agent-accent-efficient',
    accentHex: '#722ed1',
    avatarLabel: 'E',
    description: '直击重点，适合碎片复习、查缺补漏和快速定位答案。'
  }
] as const;

/** 根据 key 返回稳定风格配置。 */
export function resolveAgentConfigPreset(styleKey: AgentStyleKey = DEFAULT_AGENT_STYLE_KEY) {
  return (
    AGENT_CONFIG_PRESETS.find(preset => preset.key === styleKey) ??
    AGENT_CONFIG_PRESETS[0]
  );
}

/** 映射为前后端共享的最小请求字段。 */
export function toAgentConfigPayload(
  preset: AgentConfigPreset
): AgentConfigPayload {
  return {
    key: preset.key,
    displayName: preset.displayName,
    tone: preset.tone,
    accentHex: preset.accentHex,
    avatarLabel: preset.avatarLabel
  };
}
