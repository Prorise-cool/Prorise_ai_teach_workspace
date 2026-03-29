/**
 * 小麦阴影令牌。
 * 同时覆盖通用层级阴影和玻璃态 / 聚焦态场景。
 */
export const shadowTokens = {
  light: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 12px rgba(23, 12, 5, 0.08)',
    lg: '0 8px 24px rgba(23, 12, 5, 0.12)',
    xl: '0 20px 25px -5px rgba(245, 197, 71, 0.22)',
    card: '0 0 0 1px rgba(230, 220, 200, 0.72), 0 12px 32px rgba(59, 23, 1, 0.08)',
    nav: '0 8px 20px rgba(59, 23, 1, 0.08)',
    dialog: '0 24px 60px rgba(59, 23, 1, 0.16)'
  },
  dark: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 4px 12px rgba(0, 0, 0, 0.32)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(230, 184, 65, 0.24)',
    card: '0 0 0 1px rgba(245, 237, 225, 0.08), 0 18px 40px rgba(0, 0, 0, 0.32)',
    nav: '0 10px 28px rgba(0, 0, 0, 0.28)',
    dialog: '0 28px 64px rgba(0, 0, 0, 0.42)'
  }
} as const;
