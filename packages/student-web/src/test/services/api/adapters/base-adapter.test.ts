import {
  pickAdapterImplementation,
  resolveRuntimeMode
} from '@/services/api/adapters/base-adapter';

describe('base adapter runtime mode', () => {
  it('honors explicit mock override before reading env', () => {
    expect(resolveRuntimeMode({ useMock: true })).toBe('mock');
    expect(resolveRuntimeMode({ useMock: false })).toBe('real');
  });

  it('selects the matching adapter implementation', () => {
    const implementation = pickAdapterImplementation(
      {
        mock: 'mock-adapter',
        real: 'real-adapter'
      },
      { useMock: true }
    );

    expect(implementation).toBe('mock-adapter');
  });
});
