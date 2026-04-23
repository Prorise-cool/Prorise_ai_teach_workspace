/**
 * 文件说明：React 组件树错误边界。
 *
 * Wave 0.2 审计发现全仓 0 个 ErrorBoundary：任何渲染/生命周期异常
 * 都会导致整页白屏。本组件提供一个 class 形态的边界，捕获下游渲染错误，
 * 调用 `console.error` 记录原始 `error` 与 `errorInfo`，
 * 并使用共享 `<ErrorState>` 渲染兜底 UI。
 *
 * 默认提供“重试”按钮，点击后清空内部 `error` 状态触发再渲染；
 * 调用方也可以通过 `onRetry` 注入自定义恢复逻辑（例如刷新数据）。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from '@/components/states';

export interface ErrorBoundaryProps {
  /** 被包裹的子树。 */
  children: ReactNode;
  /** 兜底标题，默认 “页面出现错误”。 */
  title?: string;
  /** 自定义兜底描述生成函数，默认展示 `error.message`。 */
  describeError?: (error: Error) => string;
  /** 重试按钮文案，默认 “重试”。 */
  retryLabel?: string;
  /**
   * 自定义重试回调；不传则仅清空错误状态重新渲染子树。
   * 若希望刷新整个页面，业务可传入 `() => window.location.reload()`。
   */
  onRetry?: () => void;
  /**
   * 完全自定义兜底 UI。若提供，则忽略 `title` / `describeError` / `retryLabel`。
   * 参数包含当前错误与重置回调，方便渲染自定义结构。
   */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /**
   * 错误回调，可用于上报到监控平台；不影响兜底 UI 的渲染。
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 额外 className，透传给默认 `<ErrorState>`。 */
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 应用级错误边界。
 *
 * 典型用法：
 * ```tsx
 * <ErrorBoundary>
 *   <AppShell />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 使用 console.error 统一落地，未来可接监控平台。
    console.error('[ErrorBoundary] caught render error', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  /**
   * 清空错误状态，触发子树重新渲染。
   */
  private readonly handleReset = (): void => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.handleReset });
    }

    const describe = this.props.describeError ?? ((err: Error) => err.message || '未知错误');

    return (
      <ErrorState
        title={this.props.title ?? '页面出现错误'}
        message={describe(error)}
        onRetry={this.handleReset}
        retryLabel={this.props.retryLabel ?? '重试'}
        className={this.props.className}
      />
    );
  }
}
