import { screen } from '@testing-library/react';

import { HomePage } from '@/features/home/home-page';
import { renderWithMemoryRouter } from '@/test/helpers/router';

describe('HomePage', () => {
  it('renders the official dual-entry homepage content', () => {
    renderWithMemoryRouter(<HomePage />);

    expect(
      screen.getByRole('heading', {
        name: '一眼分清“系统学一个主题”与“讲清一题”'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '我想系统学一个主题' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '帮我讲清一道题' })
    ).toBeInTheDocument();
  });
});
