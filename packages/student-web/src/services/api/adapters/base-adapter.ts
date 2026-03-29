/**
 * 文件说明：沉淀 mock / real adapter 的统一模式解析与选择逻辑。
 */

export type AdapterRuntimeMode = 'mock' | 'real';

type ResolveRuntimeModeOptions = {
  useMock?: boolean;
};

export function resolveRuntimeMode(
  options: ResolveRuntimeModeOptions = {}
): AdapterRuntimeMode {
  const useMock = options.useMock ?? import.meta.env.VITE_APP_USE_MOCK === 'Y';

  return useMock ? 'mock' : 'real';
}

export function pickAdapterImplementation<T>(
  implementations: Record<AdapterRuntimeMode, T>,
  options: ResolveRuntimeModeOptions = {}
) {
  return implementations[resolveRuntimeMode(options)];
}
