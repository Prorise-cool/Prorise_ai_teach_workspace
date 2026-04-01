/**
 * 文件说明：桥接 API 层与路由层的统一认证异常信号。
 */

export type AuthSignalStatus = 401 | 403;

export type AuthSignal = {
  status: AuthSignalStatus;
  message: string;
};

type AuthSignalListener = (signal: AuthSignal) => void;

const listeners = new Set<AuthSignalListener>();

/** 广播统一认证信号，供路由壳层集中处理。 */
export function emitAuthSignal(signal: AuthSignal) {
  listeners.forEach(listener => {
    listener(signal);
  });
}

/** 订阅统一认证信号。 */
export function subscribeAuthSignal(listener: AuthSignalListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** 仅供测试清理全局监听器。 */
export function resetAuthSignalsForTest() {
  listeners.clear();
}
