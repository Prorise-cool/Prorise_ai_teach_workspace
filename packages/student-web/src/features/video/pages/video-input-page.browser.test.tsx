/**
 * 文件说明：验证真实浏览器环境下，视频输入页提交后能跳转到生成等待页。
 */
import { page } from 'vitest/browser';

import { renderBrowserApp } from '@/test/browser/render-app';
import {
  seedCompletedUserProfile,
  seedMockAuthSession
} from '@/test/utils/session';

describe('VideoInputPage Browser Flow', () => {
  it('submits video input and navigates to the generating route', async () => {
    const session = await seedMockAuthSession();
    seedCompletedUserProfile({ userId: session.user.id });
    await renderBrowserApp({ initialPath: '/video/input' });

    await vi.waitFor(() => {
      expect(window.location.pathname).toBe('/video/input');
    });
    const promptField = page.getByRole('textbox').first();
    await expect.element(promptField).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: '生成视频' })).toBeInTheDocument();

    await promptField.fill('证明洛必达法则为什么成立，请给出完整推导。');
    await page.getByRole('button', { name: '生成视频' }).click();

    await vi.waitFor(() => {
      expect(window.location.pathname).toMatch(
        /^\/video\/vtask_mock_text_[^/]+\/generating$/
      );
    });
    await expect.element(page.getByRole('button', { name: '返回工作台' })).toBeInTheDocument();
  });
});
