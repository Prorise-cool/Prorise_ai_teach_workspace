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
export type {
  TaskAdapter
} from './task-adapter';
export {
  TaskAdapterError,
  createMockTaskAdapter,
  createRealTaskAdapter,
  resolveTaskAdapter
} from './task-adapter';
export type {
  VideoTaskAdapter
} from './video-task-adapter';
export {
  VideoTaskAdapterError,
  createMockVideoTaskAdapter,
  createRealVideoTaskAdapter,
  isVideoTaskAdapterError,
  resolveVideoTaskAdapter
} from './video-task-adapter';
export {
  pickAdapterImplementation,
  resolveRuntimeMode
} from './base-adapter';
