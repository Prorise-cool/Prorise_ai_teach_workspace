import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

import { APP_DEFAULT_LOCALE, appI18n } from '@/app/i18n';

beforeEach(async () => {
  await appI18n.changeLanguage(APP_DEFAULT_LOCALE);
});
