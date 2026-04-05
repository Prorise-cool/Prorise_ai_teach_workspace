import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

const DEFAULT_RUOYI_PROXY_TARGET = 'http://127.0.0.1:8080';
const DEFAULT_FASTAPI_PROXY_TARGET = 'http://127.0.0.1:8090';

export function createViteConfig(mode: string) {
  const env = loadEnv(mode, __dirname, '');
  const ruoyiProxyTarget =
    env.VITE_RUOYI_BASE_URL?.trim() || DEFAULT_RUOYI_PROXY_TARGET;
  const fastapiProxyTarget =
    env.VITE_FASTAPI_BASE_URL?.trim() || DEFAULT_FASTAPI_PROXY_TARGET;

  return {
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
      port: 5173,
      proxy: {
        '/auth': {
          target: ruoyiProxyTarget,
          changeOrigin: true
        },
        '/system': {
          target: ruoyiProxyTarget,
          changeOrigin: true
        },
        '/api/user': {
          target: ruoyiProxyTarget,
          changeOrigin: true
        },
        '/api/v1': {
          target: fastapiProxyTarget,
          changeOrigin: true
        }
      }
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
  };
}

export default defineConfig(({ mode }) => createViteConfig(mode));
