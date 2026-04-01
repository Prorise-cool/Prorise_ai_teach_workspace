import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { LoginPage } from '@/features/auth/login-page';
import { NoAccessPage } from '@/features/auth/no-access-page';
import { RequireAuth } from '@/features/auth/require-auth';
import { RequireRole } from '@/features/auth/require-role';
import { ClassroomInputShell } from '@/features/classroom/classroom-input-shell';
import { HomePage } from '@/features/home/home-page';
import { LandingPage } from '@/features/landing/landing-page';
import { CLASSROOM_INPUT_ROUTE, LANDING_ROUTE, LOGIN_ROUTE, NO_ACCESS_ROUTE, VIDEO_INPUT_ROUTE } from '@/features/navigation/route-paths';
import { VideoInputShell } from '@/features/video/video-input-shell';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: LANDING_ROUTE.slice(1),
        element: <LandingPage />
      },
      {
        path: LOGIN_ROUTE.slice(1),
        element: <LoginPage />
      },
      {
        path: NO_ACCESS_ROUTE.slice(1),
        element: <NoAccessPage />
      },
      {
        path: VIDEO_INPUT_ROUTE.slice(1),
        element: (
          <RequireAuth>
            <RequireRole requiredPermissions={['video:task:add']}>
              <VideoInputShell />
            </RequireRole>
          </RequireAuth>
        )
      },
      {
        path: CLASSROOM_INPUT_ROUTE.slice(1),
        element: (
          <RequireAuth>
            <RequireRole requiredPermissions={['classroom:session:add']}>
              <ClassroomInputShell />
            </RequireRole>
          </RequireAuth>
        )
      }
    ]
  }
];

export const appRouter = createBrowserRouter(appRoutes);
