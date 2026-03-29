import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/app';
import '@/styles/globals.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到根挂载节点 #root');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
