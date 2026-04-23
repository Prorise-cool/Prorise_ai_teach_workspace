/**
 * 文件说明：共享 UI 状态组件统一导出。
 *
 * 提供 LoadingState / EmptyState / ErrorState 三件套，
 * 用于在加载、空数据、错误三种典型状态下保持视觉一致。
 *
 * Wave 0.2 仅新建组件，**未强制迁移**现有 feature 内联实现，
 * 新增 UI 时优先使用本组件。
 */
export { LoadingState } from './LoadingState';
export type {
  LoadingStateProps,
  LoadingStateSize,
  LoadingStateVariant,
} from './LoadingState';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
