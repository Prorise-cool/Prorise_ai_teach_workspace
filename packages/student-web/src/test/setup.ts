import '@testing-library/jest-dom/vitest';

import { resetAuthStoreForTest } from '@/stores/auth-store';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetAuthStoreForTest();
});
