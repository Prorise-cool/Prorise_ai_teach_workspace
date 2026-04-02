import { act, render, screen } from '@testing-library/react';

import { appI18n } from '@/app/i18n';
import { HomePage } from '@/features/home/home-page';

describe('HomePage', () => {
  it('renders scaffold placeholder content', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: '小麦学生端模板已就绪' })
    ).toBeInTheDocument();
  });

  it('updates scaffold copy when the locale changes', async () => {
    render(<HomePage />);

    await act(async () => {
      await appI18n.changeLanguage('en-US');
    });

    expect(
      screen.getByRole('heading', {
        name: 'XiaoMai student web scaffold is ready'
      })
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
  });
});
