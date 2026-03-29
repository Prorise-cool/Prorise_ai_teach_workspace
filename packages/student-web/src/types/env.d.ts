interface ImportMetaEnv {
  readonly VITE_RUOYI_BASE_URL: string;
  readonly VITE_FASTAPI_BASE_URL: string;
  readonly VITE_APP_ENCRYPT: 'Y' | 'N';
  readonly VITE_APP_SSE: 'Y' | 'N';
  readonly VITE_APP_USE_MOCK: 'Y' | 'N';
  readonly VITE_APP_DEFAULT_LOCALE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
