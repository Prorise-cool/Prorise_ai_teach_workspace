import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/app/provider/query-provider';

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-center" richColors />
    </QueryProvider>
  );
}
