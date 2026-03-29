/**
 * 文件说明：汇总 student-web 对外暴露的 API adapters。
 */

export type {
  AuthAdapter
} from './auth-adapter';
export {
  AuthAdapterError,
  createMockAuthAdapter,
  createRealAuthAdapter,
  createAuthError,
  isAuthError,
  mapRuoyiLoginToken,
  mapRuoyiUserInfo,
  resolveAuthAdapter
} from './auth-adapter';
