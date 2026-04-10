/**
 * 文件说明：认证 adapter 模块的统一导出入口。
 * 保持与原 auth-adapter.ts 完全一致的公开 API。
 */

export type { AuthAdapter } from "./auth-mappers";
export {
  mapRuoyiLoginToken,
  mapRuoyiUserInfo,
} from "./auth-mappers";
export {
  AuthAdapterError,
  createAuthError,
  isAuthError,
} from "./auth-errors";
export {
  createMockAuthAdapter,
  createRealAuthAdapter,
  resolveAuthAdapter,
} from "./auth-adapter";
