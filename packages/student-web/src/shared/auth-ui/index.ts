/**
 * 共享认证 UI 组件与 hooks。
 * 从 auth feature 抽取，供 profile onboarding 等需要复用认证页视觉的模块消费。
 */
export { AuthScene } from './auth-scene';
export type { AuthInteractionZone, AuthScenePhase } from './auth-scene';
export { useAuthPageUiState } from './use-auth-page-ui-state';
export { useAuthPageCopy } from './auth-content';
