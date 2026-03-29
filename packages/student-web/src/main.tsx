import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/app';
import { initializeAppRuntime } from '@/services/runtime/bootstrap';
import '@/styles/globals.css';

export async function bootstrapApplication() {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('未找到根挂载节点 #root');
  }

  await initializeAppRuntime();

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrapApplication();
