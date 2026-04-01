import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { normalizeReturnTo } from '@/services/auth';
import { subscribeAuthSignal } from '@/services/auth-signals';
import { useAuthStore } from '@/stores/auth-store';

function buildLoginRedirect(currentPath: string) {
  const normalizedReturnTo = normalizeReturnTo(currentPath);

  return `/login?returnTo=${encodeURIComponent(normalizedReturnTo)}`;
}

function AuthRuntimeBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const clearSession = useAuthStore(state => state.clearSession);
  const hydrateFromStorage = useAuthStore(state => state.hydrateFromStorage);
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    return subscribeAuthSignal(signal => {
      if (signal.status === 401) {
        clearSession();
        toast.error(signal.message);
        void navigate(buildLoginRedirect(currentPath), {
          replace: true,
          state: {
            source: 'api-401',
            returnTo: currentPath
          }
        });

        return;
      }

      toast.error(signal.message);
      void navigate('/403', {
        replace: true,
        state: {
          from: currentPath,
          message: signal.message
        }
      });
    });
  }, [clearSession, currentPath, navigate]);

  return null;
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthRuntimeBridge />
      <Outlet />
    </div>
  );
}
