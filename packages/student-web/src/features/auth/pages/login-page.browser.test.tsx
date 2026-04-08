/**
 * 文件说明：验证真实浏览器环境下，认证守卫能跳转到登录页并在登录后恢复原始业务路径。
 */
import { page } from 'vitest/browser';

import { AUTH_RETURN_TO_KEY } from '@/services/auth';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import { renderBrowserApp } from '@/test/browser/render-app';
import { seedCompletedUserProfile } from '@/test/utils/session';

describe('LoginPage Browser Flow', () => {
  it('redirects to login and restores returnTo after a successful sign-in', async () => {
    seedCompletedUserProfile({ userId: '1' });
    await renderBrowserApp({ initialPath: '/video/input' });

    await vi.waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
    await expect.element(page.getByRole('textbox', { name: '账号' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(
      new URL(window.location.href).searchParams.get(AUTH_RETURN_TO_KEY)
    ).toBe('/video/input');

    await page.getByRole('textbox', { name: '账号' }).fill('admin');
    await page.getByRole('textbox', { name: '密码' }).fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();

    await vi.waitFor(() => {
      expect(window.location.pathname).toBe('/video/input');
    });
    await expect.element(page.getByRole('button', { name: '生成视频' })).toBeInTheDocument();
    expect(useAuthSessionStore.getState().session?.user.username).toBe('admin');
  });
});
