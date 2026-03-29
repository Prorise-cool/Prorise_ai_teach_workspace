/**
 * 小麦排版令牌。
 * 以系统字体栈和中文优先体验为主，保证加载速度与阅读稳定性。
 */
export const fontFamilyTokens = {
  sans:
    '"SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  mono: '"SF Mono", "Monaco", "JetBrains Mono", "Fira Code", monospace',
  numeric:
    '"SF Pro Display", "SF Pro Text", "Inter", "PingFang SC", "Noto Sans SC", sans-serif'
} as const;

export const fontSizeTokens = {
  h1: '48px',
  h2: '36px',
  h3: '24px',
  bodyLarge: '18px',
  body: '16px',
  bodySmall: '14px',
  caption: '12px'
} as const;

export const fontWeightTokens = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
} as const;

export const lineHeightTokens = {
  tight: '1.2',
  compact: '1.3',
  normal: '1.5',
  relaxed: '1.6'
} as const;

export const typographyTokens = {
  family: fontFamilyTokens,
  size: fontSizeTokens,
  weight: fontWeightTokens,
  lineHeight: lineHeightTokens
} as const;
