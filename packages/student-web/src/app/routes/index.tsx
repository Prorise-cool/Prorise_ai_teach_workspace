import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/app/layouts/app-shell';
import { HomePage } from '@/features/home/home-page';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />
      }
    ]
  }
]);
