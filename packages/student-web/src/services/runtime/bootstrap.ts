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
