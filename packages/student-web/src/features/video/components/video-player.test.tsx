import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithApp } from '@/test/utils/render-app';

import { VideoPlayer } from './video-player';

const videojsMock = vi.hoisted(() => vi.fn());
const onMock = vi.hoisted(() => vi.fn());
const disposeMock = vi.hoisted(() => vi.fn());
const errorMock = vi.hoisted(() => vi.fn(() => null));

vi.mock('video.js', () => ({
  default: videojsMock,
}));

describe('VideoPlayer', () => {
  beforeEach(() => {
    videojsMock.mockReturnValue({
      on: onMock,
      dispose: disposeMock,
      error: errorMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses fill mode so embedded players follow the external container size', async () => {
    renderWithApp(
      <div style={{ width: 320, height: 180 }}>
        <VideoPlayer videoUrl="https://static.prorise.test/clip.mp4" />
      </div>,
    );

    await waitFor(() => {
      expect(videojsMock).toHaveBeenCalledTimes(1);
    });

    expect(videojsMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        controls: true,
        responsive: true,
        fluid: false,
        fill: true,
        sources: [
          expect.objectContaining({
            src: 'https://static.prorise.test/clip.mp4',
            type: 'video/mp4',
          }),
        ],
      }),
    );
  });

  it('keeps the same fill strategy when controls are hidden', async () => {
    renderWithApp(
      <div style={{ width: 640, height: 360 }}>
        <VideoPlayer
          videoUrl="https://static.prorise.test/final.mp4"
          hideControls
        />
      </div>,
    );

    await waitFor(() => {
      expect(videojsMock).toHaveBeenCalledTimes(1);
    });

    expect(videojsMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        controls: false,
        fluid: false,
        fill: true,
      }),
    );
  });

  it('maps webm assets to the correct mime type', async () => {
    renderWithApp(
      <div style={{ width: 640, height: 360 }}>
        <VideoPlayer videoUrl="https://static.prorise.test/final-output.webm" hideControls />
      </div>,
    );

    await waitFor(() => {
      expect(videojsMock).toHaveBeenCalledTimes(1);
    });

    expect(videojsMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        sources: [
          expect.objectContaining({
            src: 'https://static.prorise.test/final-output.webm',
            type: 'video/webm',
          }),
        ],
      }),
    );
  });
});
