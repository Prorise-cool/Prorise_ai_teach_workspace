import { resolveFastapiBaseUrl } from '@/services/auth-consistency';
import { resolveRuoyiBaseUrl } from '@/services/api/client';

describe('base url resolution', () => {
  it('prefers same-origin proxy paths during development when no explicit backend address is provided', () => {
    expect(resolveRuoyiBaseUrl(undefined, true)).toBe('');
    expect(resolveFastapiBaseUrl(undefined, true)).toBe('');
  });

  it('falls back to the local联调后端地址 outside development when env is absent', () => {
    expect(resolveRuoyiBaseUrl(undefined, false)).toBe('http://127.0.0.1:8080');
    expect(resolveFastapiBaseUrl(undefined, false)).toBe('http://127.0.0.1:8090');
  });

  it('uses explicit env values with trimming before any fallback', () => {
    expect(resolveRuoyiBaseUrl(' http://ruoyi.prorise.local ', true)).toBe(
      'http://ruoyi.prorise.local'
    );
    expect(resolveFastapiBaseUrl(' http://fastapi.prorise.local ', true)).toBe(
      'http://fastapi.prorise.local'
    );
  });
});
