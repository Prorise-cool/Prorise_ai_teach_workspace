/**
 * Phase 5: InteractiveRenderer 单测。
 *
 * 守护点：
 * - widget_html 优先于 legacy html / url
 * - iframe sandbox 严格为 `allow-scripts`（禁止 same-origin / top-navigation / popups / forms）
 * - 空内容 → 显示 fallback 提示
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithApp } from '@/test/utils/render-app';

import type { InteractiveScene } from '../../types/scene';

import { InteractiveRenderer } from './interactive-renderer';

const baseScene: Omit<InteractiveScene, 'content'> = {
  id: 'scene-1',
  title: '抛体运动模拟',
  type: 'interactive',
  order: 2,
};

describe('InteractiveRenderer', () => {
  it('renders widgetHtml via iframe srcDoc with strict sandbox', () => {
    const html = '<!DOCTYPE html><html><body>widget</body></html>';
    renderWithApp(
      <InteractiveRenderer
        content={{ widgetHtml: html, widgetType: 'simulation' }}
        sceneTitle={baseScene.title}
        sceneOrder={2}
      />,
    );

    const iframe = screen.getByTitle('抛体运动模拟') as HTMLIFrameElement;
    expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    expect(iframe.getAttribute('srcdoc')).toBe(html);
    // sandbox 必须严格为 allow-scripts，不能带 same-origin / top-navigation / popups / forms
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('falls back to legacy html when widgetHtml missing', () => {
    const html = '<html>legacy</html>';
    renderWithApp(
      <InteractiveRenderer
        content={{ html }}
        sceneTitle={baseScene.title}
        sceneOrder={2}
      />,
    );
    const iframe = screen.getByTitle('抛体运动模拟') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toBe(html);
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('uses iframe src when only url present', () => {
    renderWithApp(
      <InteractiveRenderer
        content={{ url: 'https://example.com/widget' }}
        sceneTitle={baseScene.title}
        sceneOrder={2}
      />,
    );
    const iframe = screen.getByTitle('抛体运动模拟') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe('https://example.com/widget');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.hasAttribute('srcdoc')).toBe(false);
  });

  it('shows placeholder when content is empty', () => {
    renderWithApp(
      <InteractiveRenderer
        content={{}}
        sceneTitle={baseScene.title}
        sceneOrder={2}
      />,
    );
    // i18n key 的 zh-CN 默认值
    expect(screen.getByText(/交互式内容暂未加载/)).toBeInTheDocument();
  });

  it('does NOT grant allow-same-origin / allow-forms / allow-popups / allow-top-navigation', () => {
    // 这是安全硬约束的正面测试：无论什么 widget_type，sandbox 都只能是 allow-scripts
    const widgetTypes = ['simulation', 'diagram', 'code', 'game', 'visualization3d'] as const;
    for (const widgetType of widgetTypes) {
      const { container } = render(
        <InteractiveRenderer
          content={{ widgetHtml: '<html></html>', widgetType }}
          sceneTitle={`scene-${widgetType}`}
          sceneOrder={1}
        />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      const sandbox = iframe!.getAttribute('sandbox') ?? '';
      expect(sandbox).toBe('allow-scripts');
      // 双重防御：逐一确认危险 flag 不存在
      expect(sandbox).not.toContain('allow-same-origin');
      expect(sandbox).not.toContain('allow-top-navigation');
      expect(sandbox).not.toContain('allow-popups');
      expect(sandbox).not.toContain('allow-forms');
    }
  });
});
