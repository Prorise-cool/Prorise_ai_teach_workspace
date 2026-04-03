import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

import { APP_DEFAULT_LOCALE, appI18n } from '@/app/i18n';

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null;

  readonly rootMargin = '0px';

  readonly thresholds = [0];

  observe() {}

  unobserve() {}

  disconnect() {}

  takeRecords() {
    return [];
  }
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver =
    IntersectionObserverMock as typeof IntersectionObserver;
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeEach(async () => {
  await appI18n.changeLanguage(APP_DEFAULT_LOCALE);
});
