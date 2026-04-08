/**
 * 文件说明：封装 Vitest Browser Mode 下的完整应用挂载入口。
 * 负责按测试用例创建独立 Browser Router，并在真实浏览器环境里启动 mock 运行时。
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AppProvider } from '@/app/provider/app-provider';
import { createAppRouter } from '@/app/routes';
import { initializeAppRuntime } from '@/services/runtime/bootstrap';
import '@/styles/globals.css';

type RenderBrowserAppOptions = {
  initialPath?: string;
};

let activeRoot: Root | null = null;
let browserRuntimeReadyPromise: Promise<void> | null = null;

/**
 * 确保浏览器级测试只初始化一次 mock 运行时。
 *
 * @returns 运行时准备完成后的 Promise。
 */
async function ensureBrowserRuntimeReady() {
  if (!browserRuntimeReadyPromise) {
    browserRuntimeReadyPromise = initializeAppRuntime({
      useMock: true
    }).then(() => undefined);
  }

  await browserRuntimeReadyPromise;
}

/**
 * 创建新的根容器，避免不同测试复用旧的挂载点。
 *
 * @returns 当前测试用例专属的根容器。
 */
function createRootContainer() {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  container.id = 'root';
  document.body.append(container);

  return container;
}

/**
 * 卸载当前浏览器测试挂载的应用。
 *
 * @returns 清理完成后的 Promise。
 */
export function cleanupBrowserApp() {
  if (activeRoot) {
    act(() => {
      activeRoot?.unmount();
    });
    activeRoot = null;
  }

  document.body.innerHTML = '';
}

/**
 * 在真实浏览器中渲染完整应用，并返回当前测试的 router 实例。
 *
 * @param options - 浏览器渲染选项。
 * @param options.initialPath - 初始访问路径。
 * @returns 新创建的 router 与挂载容器。
 */
export async function renderBrowserApp(
  options: RenderBrowserAppOptions = {}
) {
  cleanupBrowserApp();
  window.history.replaceState({}, '', options.initialPath ?? '/');
  await ensureBrowserRuntimeReady();

  const container = createRootContainer();
  const router = createAppRouter();
  activeRoot = createRoot(container);

  act(() => {
    activeRoot?.render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );
  });

  return {
    container,
    router
  };
}
