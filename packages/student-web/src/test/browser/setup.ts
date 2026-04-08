/**
 * 文件说明：Vitest Browser Mode 全局 setup。
 * 负责复用通用测试初始化，并在每个浏览器用例前后重置运行态与挂载内容。
 */
import { afterEach, beforeEach } from 'vitest';

import { cleanupBrowserApp } from '@/test/browser/render-app';
import { resetAppTestState } from '@/test/utils/session';
import '@/test/setup';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

beforeEach(async () => {
  cleanupBrowserApp();
  await resetAppTestState();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanupBrowserApp();
});
