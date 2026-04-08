import {
  agentAccentTokens,
  authPageTokens,
  colorTokens,
  motionTokens,
  radiusTokens,
  shadowTokens,
  typographyTokens
} from '@/styles/tokens';

describe('design tokens', () => {
  it('keeps the XiaoMai brand color and agent accents stable', () => {
    expect(colorTokens.brand[400]).toBe('#f5c547');
    expect(agentAccentTokens.serious).toBe('#4A6FA5');
    expect(agentAccentTokens.humorous).toBe('#FF9500');
    expect(agentAccentTokens.patient).toBe('#52C41A');
    expect(agentAccentTokens.efficient).toBe('#722ED1');
  });

  it('provides base radius, motion, typography and shadow tokens', () => {
    expect(radiusTokens.lg).toBe('16px');
    expect(motionTokens.duration.base).toBe('300ms');
    expect(typographyTokens.size.h1).toBe('48px');
    expect(shadowTokens.light.card).toContain('rgba');
  });

  it('exposes auth page layout and palette tokens for page-level reuse', () => {
    expect(authPageTokens.layout.containerMaxWidth).toBe('1080px');
    expect(authPageTokens.layout.panelPaddingX).toBe('70px');
    expect(authPageTokens.scene.character3).toBe('#f5c547');
    expect(authPageTokens.shadow.light.container).toContain('72px');
  });
});
