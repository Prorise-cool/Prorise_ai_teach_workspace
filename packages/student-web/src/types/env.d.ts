/**
 * 文件说明：声明 Vite 环境变量的类型边界。
 * 所有浏览器侧可读取的构建期变量都应在这里显式列出。
 */
interface ImportMetaEnv {
  readonly VITE_RUOYI_BASE_URL: string;
  readonly VITE_FASTAPI_BASE_URL: string;
  readonly VITE_APP_ENCRYPT: 'Y' | 'N';
  readonly VITE_APP_CLIENT_ID: string;
  readonly VITE_HEADER_FLAG: string;
  readonly VITE_APP_RSA_PUBLIC_KEY: string;
  readonly VITE_APP_RSA_PRIVATE_KEY: string;
  readonly VITE_APP_SSE: 'Y' | 'N';
  readonly VITE_APP_USE_MOCK: 'Y' | 'N';
  readonly VITE_APP_DEFAULT_LOCALE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
