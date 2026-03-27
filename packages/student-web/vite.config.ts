/**
 * Vite 与 Vitest 配置。
 * 当前显式约束测试只从 `src/test/` 收集，避免测试文件继续散落到业务目录。
 */
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import AutoImport from 'unplugin-auto-import/vite'
import checker from 'vite-plugin-checker'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    AutoImport({
      dts: 'src/types/auto-imports.d.ts',
      imports: [
        'react',
        {
          'react-dom/client': ['createRoot'],
          'react-router-dom': ['createBrowserRouter', 'useLocation', 'useNavigate'],
          zustand: ['create'],
        },
      ],
      dirs: ['src/lib'],
    }),
    checker({
      typescript: true,
    }),
  ],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
    },
    tsconfigPaths: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
  test: {
    include: ['src/test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
