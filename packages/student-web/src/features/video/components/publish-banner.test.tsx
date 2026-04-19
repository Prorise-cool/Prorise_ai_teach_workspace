import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithApp } from '@/test/utils/render-app';

import { PublishBanner } from './publish-banner';

const notifyMock = vi.fn();

vi.mock('@/shared/feedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/feedback')>();

  return {
    ...actual,
    useFeedback: () => ({
      notify: notifyMock,
      dismissNotice: vi.fn(),
      showSpotlight: vi.fn(),
      hideSpotlight: vi.fn(),
      showLoadingBar: vi.fn(),
      hideLoadingBar: vi.fn(),
    }),
  };
});

describe('PublishBanner', () => {
  it('copies the explicit public url instead of window.location.href', async () => {
    const user = userEvent.setup();
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: clipboardWriteText,
      },
    });

    renderWithApp(
      <PublishBanner
        published
        publicUrl="https://app.prorise.test/video/public/result_1"
      />,
    );

    await user.click(screen.getByRole('button', { name: '复制公开链接' }));

    expect(clipboardWriteText).toHaveBeenCalledWith(
      'https://app.prorise.test/video/public/result_1',
    );
  });
});
