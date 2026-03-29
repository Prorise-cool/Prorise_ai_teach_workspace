import { render, screen } from '@testing-library/react';

import { HomePage } from '@/features/home/home-page';

describe('HomePage', () => {
  it('renders scaffold placeholder content', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: '小麦学生端模板已就绪' })
    ).toBeInTheDocument();
  });
});
