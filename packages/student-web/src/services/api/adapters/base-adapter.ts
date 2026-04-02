/**
 * 文件说明：沉淀 mock / real adapter 的统一模式解析与选择逻辑。
 */

export type AdapterRuntimeMode = 'mock' | 'real';

type ResolveRuntimeModeOptions = {
  useMock?: boolean;
};

/**
 * 根据显式配置或环境变量解析当前 adapter 运行模式。
 *
 * @param options - 运行模式参数。
 * @returns `mock` 或 `real` 模式。
 */
export function resolveRuntimeMode(
  options: ResolveRuntimeModeOptions = {}
): AdapterRuntimeMode {
  const useMock = options.useMock ?? import.meta.env.VITE_APP_USE_MOCK === 'Y';

  return useMock ? 'mock' : 'real';
}

/**
 * 按运行模式从候选实现中挑选最终 adapter。
 *
 * @param implementations - `mock` 与 `real` 实现映射。
 * @param options - 运行模式参数。
 * @returns 与当前运行模式对应的实现。
 */
export function pickAdapterImplementation<T>(
  implementations: Record<AdapterRuntimeMode, T>,
  options: ResolveRuntimeModeOptions = {}
) {
  return implementations[resolveRuntimeMode(options)];
}
