/**
 * 小麦认证页设计令牌。
 * 用于独立认证页的布局、场景插画和表单壳层样式。
 */
export const authPageLayoutTokens = {
  containerMaxWidth: '1080px',
  containerHeight: '680px',
  sceneMinWidth: '400px',
  sceneGlowSize: '350px',
  sceneCanvasWidth: '300px',
  sceneCanvasHeight: '250px',
  sceneOffsetY: '-36px',
  panelPaddingTop: '42px',
  panelPaddingX: '70px',
  panelPaddingBottom: '46px',
  panelPaddingMobileY: '30px',
  panelPaddingMobileX: '24px',
  toolbarTop: '24px',
  toolbarRight: '28px',
  toolbarMobileTop: '18px',
  toolbarMobileRight: '18px',
  heroBottom: '50px',
  heroBottomMobile: '25px',
  title: '30px',
  titleMobile: '26px',
  tabFontSize: '15px',
  tabsMarginBottom: '28px',
  heroTitle: '26px',
  heroTitleMobile: '20px',
  formRevealOffset: '10px',
  calloutPaddingInline: '14px',
  calloutRadius: '14px',
  metaTextSize: '13px',
  primaryButtonOffset: '10px',
  socialButtonSize: '46px',
  mobileSceneHeight: '35vh',
  mobileSceneGlowSize: '250px',
  mobileSceneOffsetY: '10px',
  mobileSceneScale: '0.65'
} as const;

export const authPageColorTokens = {
  light: {
    pageGlow: 'rgba(245, 197, 71, 0.18)',
    pageGridLine: 'rgba(59, 23, 1, 0.04)',
    scenePanelStart: 'rgba(255, 255, 255, 0.84)',
    scenePanelEnd: 'rgba(245, 237, 225, 0.92)',
    sceneGlow: 'rgba(245, 197, 71, 0.12)',
    panelSurface: 'rgba(255, 255, 255, 0.78)',
    iconButtonSurface: 'rgba(255, 255, 255, 0.74)',
    inputSurface:
      'color-mix(in srgb, var(--xm-color-background-elevated) 74%, var(--xm-color-surface))',
    inputFocusRing: 'color-mix(in srgb, var(--xm-color-ring) 24%, transparent)',
    returnBannerSurface:
      'color-mix(in srgb, var(--xm-color-primary) 10%, var(--xm-color-surface))',
    formErrorBorder: 'color-mix(in srgb, var(--xm-color-error) 24%, transparent)',
    formErrorSurface:
      'color-mix(in srgb, var(--xm-color-error) 8%, var(--xm-color-surface))'
  },
  dark: {
    pageGlow: 'rgba(245, 197, 71, 0.08)',
    pageGridLine: 'rgba(245, 237, 225, 0.03)',
    scenePanelStart: 'rgba(42, 36, 32, 0.96)',
    scenePanelEnd: 'rgba(26, 22, 20, 0.98)',
    sceneGlow: 'rgba(230, 184, 65, 0.12)',
    panelSurface: 'rgba(42, 36, 32, 0.88)',
    iconButtonSurface: 'rgba(42, 36, 32, 0.92)',
    inputSurface:
      'color-mix(in srgb, var(--xm-color-background-elevated) 74%, var(--xm-color-surface))',
    inputFocusRing: 'color-mix(in srgb, var(--xm-color-ring) 24%, transparent)',
    returnBannerSurface:
      'color-mix(in srgb, var(--xm-color-primary) 14%, var(--xm-color-surface))',
    formErrorBorder: 'color-mix(in srgb, var(--xm-color-error) 28%, transparent)',
    formErrorSurface:
      'color-mix(in srgb, var(--xm-color-error) 12%, var(--xm-color-surface))'
  }
} as const;

export const authScenePaletteTokens = {
  character1: '#d97736',
  character2: '#e3d5c8',
  character3: '#f5c547',
  character4: '#5c534a',
  eye: '#ffffff',
  pupil: '#111111',
  mouth: '#111111',
  mouthStrong: '#3b1701'
} as const;

export const authPageShadowTokens = {
  light: {
    container: '0 28px 72px rgba(59, 23, 1, 0.12)',
    brandIcon: '0 6px 16px rgba(59, 23, 1, 0.12)'
  },
  dark: {
    container: '0 28px 72px rgba(0, 0, 0, 0.42)',
    brandIcon: '0 6px 16px rgba(0, 0, 0, 0.28)'
  }
} as const;

export const authPageMotionTokens = {
  characterTransition: '0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
  faceTransition: '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  formReveal: '0.4s ease',
  wake: '0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const;

export const authPageTokens = {
  layout: authPageLayoutTokens,
  color: authPageColorTokens,
  scene: authScenePaletteTokens,
  shadow: authPageShadowTokens,
  motion: authPageMotionTokens
} as const;
