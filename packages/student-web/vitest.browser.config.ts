import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import { createViteConfig } from './vite.config';

const baseViteConfig = {
  ...createViteConfig('development')
};

delete baseViteConfig.test;

export default mergeConfig(
  defineConfig(baseViteConfig),
  defineConfig({
    define: {
      'import.meta.env.VITE_APP_USE_MOCK': JSON.stringify('Y')
    },
    test: {
      globals: true,
      fileParallelism: false,
      include: ['src/**/*.browser.test.{ts,tsx}'],
      setupFiles: ['./src/test/browser/setup.ts'],
      passWithNoTests: true,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({
          actionTimeout: 10_000,
          contextOptions: {
            viewport: {
              width: 1440,
              height: 960
            }
          },
          launchOptions: {
            channel: 'chromium'
          }
        }),
        instances: [
          {
            browser: 'chromium'
          }
        ]
      }
    }
  })
);
