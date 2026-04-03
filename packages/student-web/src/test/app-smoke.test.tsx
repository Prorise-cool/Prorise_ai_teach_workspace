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
  it('renders auth consistency home content', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', {
        name: '登录态与受保护访问已经接到真实校验链路'
      })
    ).toBeInTheDocument();
  });

  it('updates auth consistency copy when the locale changes', async () => {
    renderHomePage();

    await act(async () => {
      await appI18n.changeLanguage('en-US');
    });

    expect(
      screen.getByRole('heading', {
        name: 'Session and protected-access checks now use the real validation chain'
      })
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
  });
});
