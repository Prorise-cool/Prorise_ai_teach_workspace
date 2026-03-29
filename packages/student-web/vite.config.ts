import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    AutoImport({
      dts: 'src/types/auto-imports.d.ts',
      imports: [
        {
          react: ['useEffect', 'useMemo', 'useRef', 'useState', 'useTransition'],
          'react-router-dom': [
            'Link',
            'NavLink',
            'Outlet',
            'useLocation',
            'useNavigate',
            'useParams',
            'useSearchParams'
          ],
          '@tanstack/react-query': [
            'useMutation',
            'useQuery',
            'useQueryClient'
          ]
        }
      ],
      dirs: ['src/hooks', 'src/stores'],
      eslintrc: {
        enabled: false
      }
    }),
    checker({
      typescript: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
});
