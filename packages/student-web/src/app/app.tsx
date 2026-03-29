import { AppProvider } from '@/app/provider/app-provider';
import { AppRouter } from '@/app/router/router';

export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
