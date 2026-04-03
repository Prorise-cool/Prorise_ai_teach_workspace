import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, isApiClientError } from '@/services/api/client';
import { useAuthSessionStore } from '@/stores/auth-session-store';

describe('ApiClient 401 Interception', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthSessionStore.setState({ session: { accessToken: 'fake-token' } as any });
  });

  it('clears auth session when receiving 401', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ msg: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));

    try {
      await apiClient.request({ url: '/api/test' });
    } catch (e) {
      if (isApiClientError(e)) {
        expect(e.status).toBe(401);
      }
    }

    const { session } = useAuthSessionStore.getState();
    expect(session).toBeNull();
  });

  it('retains auth session when receiving 403', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ msg: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }));

    try {
      await apiClient.request({ url: '/api/test' });
    } catch (e) {
      if (isApiClientError(e)) {
        expect(e.status).toBe(403);
      }
    }

    const { session } = useAuthSessionStore.getState();
    expect(session?.accessToken).toBe('fake-token');
  });
});
