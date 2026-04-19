import { act, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVideoPublish } from '@/features/video/hooks/use-video-publish';
import { useVideoResult } from '@/features/video/hooks/use-video-result';
import { renderWithApp } from '@/test/utils/render-app';

import { VideoResultPage } from './video-result-page';

vi.mock('@/features/video/hooks/use-video-result', () => ({
  useVideoResult: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-video-publish', () => ({
  useVideoPublish: vi.fn(),
}));

vi.mock('@/features/video/hooks/use-companion', () => ({
  useCompanion: () => ({
    turns: [],
    interactionState: 'empty',
    isAsking: false,
    bootstrap: null,
    ask: vi.fn(),
    clearTurns: vi.fn(),
    currentAnchor: { taskId: '', seconds: 0 },
  }),
}));

vi.mock('@/features/video/components/video-dock', () => ({
  VideoDock: () => <div data-testid="mock-video-dock" />,
}));

vi.mock('@/features/video/components/companion-sidebar', () => ({
  CompanionSidebar: ({ isOpen }: { isOpen: boolean }) => (
    <aside data-testid="mock-companion-sidebar" data-open={isOpen} />
  ),
}));

vi.mock('@/features/video/components/video-player', async () => {
  const React = await import('react');

  return {
    VideoPlayer: React.forwardRef(function MockVideoPlayer(
      { videoUrl }: { videoUrl: string },
      ref: React.ForwardedRef<{ getPlayer: () => unknown }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        getPlayer: () =>
          ({
            currentTime: () => 6,
            duration: () => 24,
            paused: () => true,
            play: vi.fn(),
            pause: vi.fn(),
            playbackRate: vi.fn(),
            isFullscreen: () => false,
            requestFullscreen: vi.fn(),
            exitFullscreen: vi.fn(),
          }) as never,
      }));

      return <div data-testid="mock-video-player">{videoUrl}</div>;
    }),
  };
});

const useVideoResultMock = vi.mocked(useVideoResult);
const useVideoPublishMock = vi.mocked(useVideoPublish);

function createRouter(initialEntry = '/video/vtask_result_ready') {
  return createMemoryRouter(
    [
      {
        path: '/video/:taskId',
        element: <VideoResultPage />,
      },
      {
        path: '/video/public/:resultId',
        element: <VideoResultPage />,
      },
      {
        path: '/video/input',
        element: <div>输入页</div>,
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  );
}

describe('VideoResultPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useVideoResultMock.mockReturnValue({
      data: {
        taskId: 'vtask_result_ready',
        status: 'completed',
        result: {
          taskId: 'vtask_result_ready',
          taskType: 'video',
          videoUrl: 'https://static.prorise.test/result.webm',
          coverUrl: 'https://static.prorise.test/cover.jpg',
          duration: 24,
          summary: '这个 summary 不应该作为字幕出现',
          knowledgePoints: ['洛必达法则'],
          resultId: 'result_1',
          completedAt: '2026-04-19T08:00:00Z',
          aiContentFlag: true,
          title: '证明洛必达法则',
          published: true,
          publicUrl: 'https://app.prorise.test/video/public/result_1',
          sections: [
            {
              sectionId: 'section_1',
              sectionIndex: 0,
              title: '变化率铺垫',
              summary: '先比较分子分母谁更快逼近 0。',
              narrationText: '第一段真实字幕',
              startSeconds: 0,
              endSeconds: 12,
            },
            {
              sectionId: 'section_2',
              sectionIndex: 1,
              title: '柯西中值定理',
              summary: '用中值定理把函数值之比改写为导数之比。',
              narrationText: '第二段真实字幕',
              startSeconds: 12,
              endSeconds: 24,
            },
          ],
        },
        failure: null,
      },
      viewStatus: 'success',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useVideoPublishMock.mockReturnValue({
      publish: vi.fn(),
      unpublish: vi.fn(),
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the video player and progress markers from section data', () => {
    const router = createRouter();

    renderWithApp(<RouterProvider router={router} />);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByTestId('mock-video-player')).toHaveTextContent(
      'https://static.prorise.test/result.webm',
    );
    expect(screen.getByRole('button', { name: /复制公开链接|Copy Public Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '柯西中值定理' })).toBeInTheDocument();
  });

  it('keeps the public detail route read-only while still showing the copy link button', () => {
    const router = createRouter('/video/public/result_1');

    renderWithApp(<RouterProvider router={router} />);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByRole('button', { name: /公开发布|Publish/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复制公开链接|Copy Public Link/i })).toBeInTheDocument();
  });
});
