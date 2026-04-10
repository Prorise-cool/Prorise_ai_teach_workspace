/**
 * 文件说明：汇总 student-web 对外暴露的 API adapters。
 */

export type {
  AuthAdapter
} from './auth';
export {
  AuthAdapterError,
  createMockAuthAdapter,
  createRealAuthAdapter,
  createAuthError,
  isAuthError,
  mapRuoyiLoginToken,
  mapRuoyiUserInfo,
  resolveAuthAdapter
} from './auth';
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
  createMockVideoTaskAdapter,
  createRealVideoTaskAdapter,
  isVideoTaskAdapterError,
  resolveVideoTaskAdapter
} from './video-task-adapter';
export {
  VideoTaskAdapterError,
  createVideoTaskAdapterError,
} from './video-task-error';
export type {
  VideoPublicAdapter
} from './video-public-adapter';
export {
  VideoPublicAdapterError,
  createMockVideoPublicAdapter,
  createRealVideoPublicAdapter,
  isVideoPublicAdapterError,
  resolveVideoPublicAdapter,
} from './video-public-adapter';
export type {
  VideoResultAdapter,
  VideoResultData,
} from './video-result-adapter';
export {
  VideoResultAdapterError,
  createMockVideoResultAdapter,
  createRealVideoResultAdapter,
  resolveVideoResultAdapter,
} from './video-result-adapter';
export type {
  VideoPublishAdapter,
  VideoPublishResult,
} from './video-publish-adapter';
export {
  VideoPublishAdapterError,
  createMockVideoPublishAdapter,
  createRealVideoPublishAdapter,
  resolveVideoPublishAdapter,
} from './video-publish-adapter';
export type {
  VideoPreprocessAdapter
} from './video-preprocess-adapter';
export {
  VideoPreprocessAdapterError,
  createMockVideoPreprocessAdapter,
  createRealVideoPreprocessAdapter,
  isVideoPreprocessAdapterError,
  resolveVideoPreprocessAdapter,
} from './video-preprocess-adapter';
export {
  pickAdapterImplementation,
  resolveRuntimeMode
} from './base-adapter';
