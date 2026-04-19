import { fireEvent, screen } from '@testing-library/react';
import type { RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithApp } from '@/test/utils/render-app';
import type { VideoResultSection } from '@/types/video';

import type { VideoPlayerHandle } from './video-player';
import { VideoProgressBar } from './video-progress-bar';

function createPlayerRef(durationSeconds = 60) {
  const currentTimeMock = vi.fn();

  return {
    currentTimeMock,
    playerRef: {
      current: {
        getPlayer: () =>
          ({
            currentTime: currentTimeMock,
            duration: () => durationSeconds,
          }) as never,
      },
    } as RefObject<VideoPlayerHandle | null>,
  };
}

describe('VideoProgressBar', () => {
  it('renders section markers and seeks to the section start on click', () => {
    const sections: VideoResultSection[] = [
      {
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '导数直觉',
        summary: '从平均变化率切入。',
        startSeconds: 0,
        endSeconds: 20,
      },
      {
        sectionId: 'section_2',
        sectionIndex: 1,
        title: '割线逼近',
        summary: '观察切线如何形成。',
        startSeconds: 20,
        endSeconds: 40,
      },
    ];
    const { currentTimeMock, playerRef } = createPlayerRef();

    renderWithApp(
      <VideoProgressBar
        playerRef={playerRef}
        currentTimeSeconds={6}
        durationSeconds={60}
        sections={sections}
      />,
    );

    const sectionMarker = screen.getByRole('button', { name: '割线逼近' });
    fireEvent.click(sectionMarker);

    expect(currentTimeMock).toHaveBeenCalledWith(20);
  });

  it('shows the hover tooltip summary for a section marker', () => {
    const sections: VideoResultSection[] = [
      {
        sectionId: 'section_1',
        sectionIndex: 0,
        title: '导数直觉',
        summary: '从平均变化率切入。',
        startSeconds: 0,
        endSeconds: 20,
      },
    ];
    const { playerRef } = createPlayerRef();

    renderWithApp(
      <VideoProgressBar
        playerRef={playerRef}
        currentTimeSeconds={0}
        durationSeconds={60}
        sections={sections}
      />,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: '导数直觉' }));

    expect(screen.getByText('从平均变化率切入。')).toBeInTheDocument();
    expect(screen.getByText('导数直觉')).toBeInTheDocument();
  });
});
