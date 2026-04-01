import type { ReactNode } from 'react';

import { render } from '@testing-library/react';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  type RouteObject
} from 'react-router-dom';

type MemoryRouterOptions = {
  route?: string;
};

type RouteRenderOptions = {
  initialEntries?: string[];
};

export function renderWithMemoryRouter(
  ui: ReactNode,
  options: MemoryRouterOptions = {}
) {
  return render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
  );
}

export function renderRouteObjects(
  routes: RouteObject[],
  options: RouteRenderOptions = {}
) {
  const router = createMemoryRouter(routes, {
    initialEntries: options.initialEntries ?? ['/']
  });

  return {
    router,
    ...render(<RouterProvider router={router} />)
  };
}
