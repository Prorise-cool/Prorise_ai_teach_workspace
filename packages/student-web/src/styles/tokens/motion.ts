/**
 * 小麦动效令牌。
 * 用于控制呼吸光晕、悬停反馈与焦点过渡。
 */
export const durationTokens = {
  fast: '150ms',
  base: '300ms',
  slow: '500ms',
  pulse: '3.6s'
} as const;

export const easingTokens = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)'
} as const;

export const motionTokens = {
  duration: durationTokens,
  easing: easingTokens
} as const;
