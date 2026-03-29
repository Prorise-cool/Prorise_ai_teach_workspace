/**
 * 小麦颜色令牌。
 * 保持单一品牌暖黄色主轴，老师风格色只作为局部点缀，不做全站多主题切换。
 */
export const brandColorScale = {
  50: '#fffaf0',
  100: '#fff4db',
  200: '#fde8b0',
  300: '#f9d97a',
  400: '#f5c547',
  500: '#e6b841',
  600: '#ca982f',
  700: '#9d6d18',
  800: '#6f4707',
  900: '#4a2b03'
} as const;

export const agentAccentTokens = {
  serious: '#4A6FA5',
  humorous: '#FF9500',
  patient: '#52C41A',
  efficient: '#722ED1'
} as const;

export const agentAccentSurfaceTokens = {
  serious: {
    soft: 'rgba(74, 111, 165, 0.12)',
    border: 'rgba(74, 111, 165, 0.24)'
  },
  humorous: {
    soft: 'rgba(255, 149, 0, 0.12)',
    border: 'rgba(255, 149, 0, 0.24)'
  },
  patient: {
    soft: 'rgba(82, 196, 26, 0.12)',
    border: 'rgba(82, 196, 26, 0.24)'
  },
  efficient: {
    soft: 'rgba(114, 46, 209, 0.12)',
    border: 'rgba(114, 46, 209, 0.24)'
  }
} as const;

export const taskStateColorTokens = {
  pending: '#8d6d4f',
  processing: '#f5c547',
  completed: '#52c41a',
  failed: '#ff4d4f',
  cancelled: '#8f8b86'
} as const;

export const semanticColorTokens = {
  light: {
    primary: '#f5c547',
    primaryForeground: '#3d2b00',
    secondary: '#f5ede1',
    secondaryForeground: '#3b1701',
    accent: '#f4ead0',
    accentForeground: '#3b1701',
    background: '#f5ede1',
    backgroundElevated: '#fff8ed',
    surface: '#ffffff',
    surfaceGlass: 'rgba(255, 255, 255, 0.82)',
    textPrimary: '#3b1701',
    textSecondary: '#6b4421',
    textMuted: '#8d6d4f',
    border: '#e6dcc8',
    borderStrong: 'rgba(59, 23, 1, 0.12)',
    ring: 'rgba(245, 197, 71, 0.44)',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#4a6fa5'
  },
  dark: {
    primary: '#e6b841',
    primaryForeground: '#2a1f00',
    secondary: '#2a2420',
    secondaryForeground: '#f5ede1',
    accent: '#352f2a',
    accentForeground: '#f5ede1',
    background: '#1a1614',
    backgroundElevated: '#241d1a',
    surface: '#2a2420',
    surfaceGlass: 'rgba(42, 36, 32, 0.86)',
    textPrimary: '#f5ede1',
    textSecondary: '#c4b8a8',
    textMuted: '#9d8f80',
    border: '#3d3630',
    borderStrong: 'rgba(245, 237, 225, 0.12)',
    ring: 'rgba(230, 184, 65, 0.44)',
    success: '#73d13d',
    warning: '#ffc53d',
    error: '#ff7875',
    info: '#78a8e3'
  }
} as const;

export const colorTokens = {
  brand: brandColorScale,
  semantic: semanticColorTokens,
  agent: agentAccentTokens,
  agentSurface: agentAccentSurfaceTokens,
  taskState: taskStateColorTokens
} as const;
