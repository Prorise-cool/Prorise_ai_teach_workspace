/**
 * 文件说明：集中初始化 mock / real 运行时基础设施。
 */
import { resolveRuntimeMode } from '@/services/api/adapters/base-adapter';
import { initializeMockServiceWorker } from '@/services/mock';

type RuntimeBootstrapOptions = {
  useMock?: boolean;
  onMockReady?: () => Promise<boolean> | boolean;
};

export type RuntimeBootstrapResult = {
  mode: 'mock' | 'real';
  mockReady: boolean;
};

/**
 * 初始化前端运行时依赖，并在需要时拉起 mock 基础设施。
 *
 * @param options - 运行时初始化参数。
 * @returns 当前运行模式与 mock 初始化结果。
 */
export async function initializeAppRuntime(
  options: RuntimeBootstrapOptions = {}
): Promise<RuntimeBootstrapResult> {
  const mode = resolveRuntimeMode({
    useMock: options.useMock
  });

  if (mode === 'mock') {
    const initializer = options.onMockReady ?? initializeMockServiceWorker;
    const mockReady = await initializer();

    return {
      mode,
      mockReady
    };
  }

  return {
    mode,
    mockReady: false
  };
}
