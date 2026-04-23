/**
 * 测试说明：ErrorBoundary 渲染行为。
 *
 * 用例覆盖：
 * 1. 正常子树通过时透传 children；
 * 2. 子组件抛错时渲染默认 {@link ErrorState} 兜底；
 * 3. 点击重试按钮触发 `onRetry`，并清空错误状态。
 */
import { render, screen, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

function Thrower({ shouldThrow, label }: { shouldThrow: boolean; label: string }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <div>{label}</div>;
}

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('透传正常子树', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} label="hello" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('捕获渲染错误时渲染默认兜底 UI', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow label="unused" />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('页面出现错误')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('点击重试按钮调用 onRetry 并重置状态', () => {
    const onRetry = vi.fn();
    function Harness() {
      return (
        <ErrorBoundary onRetry={onRetry}>
          <Thrower shouldThrow label="unused" />
        </ErrorBoundary>
      );
    }
    render(<Harness />);
    const retry = screen.getByRole('button', { name: '重试' });
    act(() => {
      fireEvent.click(retry);
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
