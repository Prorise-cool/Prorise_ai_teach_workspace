import { screen } from '@testing-library/react';

import { LandingPage } from '@/features/landing/landing-page';
import { renderWithMemoryRouter } from '@/test/helpers/router';

describe('LandingPage', () => {
  it('keeps marketing content separate from the default homepage and routes CTA correctly', () => {
    renderWithMemoryRouter(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        name: '把“想学什么”或“这道题不会”直接变成一堂会动的课'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '返回产品首页' })
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: '立即体验' })
    ).toHaveAttribute('href', '/login?returnTo=%2Fclassroom%2Finput');
    expect(
      screen.getByRole('link', { name: '直接去课堂体验' })
    ).toHaveAttribute('href', '/login?returnTo=%2Fclassroom%2Finput');
    expect(screen.getByText('教师试点咨询')).toBeInTheDocument();
    expect(screen.getByText('院校合作申请')).toBeInTheDocument();
  });
});
