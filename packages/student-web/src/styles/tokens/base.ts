/**
 * 小麦基础设计令牌。
 * 用于统一间距、圆角、模糊、层级等通用尺度。
 */
export const spacingTokens = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px'
} as const;

export const radiusTokens = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
  full: '9999px'
} as const;

export const blurTokens = {
  nav: '12px',
  surface: '24px',
  glow: '56px'
} as const;

export const zIndexTokens = {
  base: '0',
  floatingNav: '20',
  dropdown: '40',
  modal: '50',
  toast: '60',
  tooltip: '70'
} as const;

export const baseTokens = {
  spacing: spacingTokens,
  radius: radiusTokens,
  blur: blurTokens,
  zIndex: zIndexTokens
} as const;
