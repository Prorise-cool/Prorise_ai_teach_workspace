import { initializeAppRuntime } from '@/services/runtime/bootstrap';

describe('initializeAppRuntime', () => {
  it('starts mock infrastructure in mock mode', async () => {
    const onMockReady = vi.fn().mockResolvedValue(true);

    const result = await initializeAppRuntime({
      useMock: true,
      onMockReady
    });

    expect(result).toEqual({
      mode: 'mock',
      mockReady: true
    });
    expect(onMockReady).toHaveBeenCalledTimes(1);
  });

  it('skips mock startup in real mode', async () => {
    const onMockReady = vi.fn().mockResolvedValue(true);

    const result = await initializeAppRuntime({
      useMock: false,
      onMockReady
    });

    expect(result).toEqual({
      mode: 'real',
      mockReady: false
    });
    expect(onMockReady).not.toHaveBeenCalled();
  });
});
