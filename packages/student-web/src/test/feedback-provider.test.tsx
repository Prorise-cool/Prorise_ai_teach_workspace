import { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import { useFeedback } from '@/shared/feedback';

function FeedbackHarness() {
  const {
    notify,
    showSpotlight,
    showLoadingBar,
    hideLoadingBar
  } = useFeedback();
  const loadingBarIdRef = useRef<string | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          notify({
            tone: 'success',
            title: '测试提示',
            description: '这是一条会自动消失的全局反馈。',
            durationMs: 50
          });
        }}
      >
        trigger notice
      </button>

      <button
        type="button"
        onClick={() => {
          showSpotlight({
            tone: 'info',
            title: '正在跳转',
            description: '请稍候一下。',
            loading: true,
            durationMs: 50
          });
        }}
      >
        trigger spotlight
      </button>

      <button
        type="button"
        onClick={() => {
          loadingBarIdRef.current = showLoadingBar();
        }}
      >
        start loading bar
      </button>

      <button
        type="button"
        onClick={() => {
          if (loadingBarIdRef.current !== null) {
            hideLoadingBar(loadingBarIdRef.current);
            loadingBarIdRef.current = null;
          }
        }}
      >
        stop loading bar
      </button>

      <button
        type="button"
        onClick={() => {
          const loadingBarId = showLoadingBar();

          window.setTimeout(() => {
            hideLoadingBar(loadingBarId);
          }, 60);
        }}
      >
        flash loading bar
      </button>
    </div>
  );
}

describe('FeedbackProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders and auto-dismisses toast notices', async () => {
    render(
      <AppProvider>
        <FeedbackHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger notice' }));

    expect(await screen.findByText('测试提示')).toBeInTheDocument();
    expect(
      await screen.findByText('这是一条会自动消失的全局反馈。')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('测试提示')).not.toBeInTheDocument();
    }, {
      timeout: 1200
    });
  });

  it('renders spotlight feedback for route-like transitions', async () => {
    render(
      <AppProvider>
        <FeedbackHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger spotlight' }));

    expect(screen.getByText('正在跳转')).toBeInTheDocument();
    expect(screen.getByText('请稍候一下。')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('正在跳转')).not.toBeInTheDocument();
    }, {
      timeout: 1200
    });
  });

  it('uses a delayed top loading bar to avoid quick flashes', () => {
    vi.useFakeTimers();

    render(
      <AppProvider>
        <FeedbackHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'flash loading bar' }));

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(
      screen.queryByRole('progressbar', { name: '全局加载中' })
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(
      screen.queryByRole('progressbar', { name: '全局加载中' })
    ).not.toBeInTheDocument();
  });

  it('keeps the top loading bar visible for a minimum duration once shown', () => {
    vi.useFakeTimers();

    render(
      <AppProvider>
        <FeedbackHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'start loading bar' }));

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(
      screen.getByRole('progressbar', { name: '全局加载中' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'stop loading bar' }));

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(
      screen.getByRole('progressbar', { name: '全局加载中' })
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(
      screen.queryByRole('progressbar', { name: '全局加载中' })
    ).not.toBeInTheDocument();
  });
});
