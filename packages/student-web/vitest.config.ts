import { defineConfig, mergeConfig } from 'vitest/config';

import { createViteConfig } from './vite.config';

export default mergeConfig(
  createViteConfig('test'),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
      passWithNoTests: true
    }
  })
);
