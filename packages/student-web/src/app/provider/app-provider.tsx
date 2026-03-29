import type { PropsWithChildren } from 'react';

import { QueryProvider } from '@/app/provider/query-provider';

export function AppProvider({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
