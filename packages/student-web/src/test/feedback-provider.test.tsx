import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppProvider } from '@/app/provider/app-provider';
import { useFeedback } from '@/shared/feedback';

function FeedbackHarness() {
  const { notify, showSpotlight } = useFeedback();

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
    </div>
  );
}

describe('FeedbackProvider', () => {
  it('renders and auto-dismisses toast notices', async () => {
    render(
      <AppProvider>
        <FeedbackHarness />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger notice' }));

    expect(screen.getByText('测试提示')).toBeInTheDocument();
    expect(
      screen.getByText('这是一条会自动消失的全局反馈。')
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
});
