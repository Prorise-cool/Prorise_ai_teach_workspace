/**
 * 文件说明：验证公开首页在不同语言下都能稳定渲染核心入口结构。
 */
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { appI18n } from '@/app/i18n';
import { AppProvider } from '@/app/provider/app-provider';
import { HomePage } from '@/features/home/home-page';

function renderHomePage() {
  render(
    <AppProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AppProvider>
  );
}

describe('HomePage', () => {
  it('renders the public home entry content', () => {
    renderHomePage();

    expect(screen.getByText('XMAI')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /VIRTUAL\s*CLASSROOM/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText('关于我们')[0]).toBeInTheDocument();
    expect(screen.getByText('Start Learning')).toBeInTheDocument();
  });

  it('updates the top navigation copy when the locale changes', async () => {
    renderHomePage();

    await act(async () => {
      await appI18n.changeLanguage('en-US');
    });

    expect(screen.getAllByText('About')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Highlights')[0]).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
  });
});
