/**
 * 文件说明：统一封装 MSW Node Server 的测试生命周期注册。
 * 供 mock handler 与契约测试复用，避免每个文件重复写 listen/reset/close。
 */
import { setupServer } from 'msw/node';
import type { RequestHandler } from 'msw';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * 注册 MSW Server 生命周期钩子，并返回当前测试文件专属的 server。
 *
 * @param handlers - 当前文件需要启用的 MSW handlers。
 * @returns 已注册生命周期的 MSW server。
 */
export function registerMswServer(...handlers: RequestHandler[]) {
  const server = setupServer(...handlers);

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  return server;
}
