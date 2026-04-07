/**
 * 文件说明：student-web 浏览器入口。
 * 负责挂载全局样式，按需启动 MSW mock，然后把根应用渲染到 DOM。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/app';
import { initializeAppRuntime } from '@/services/runtime/bootstrap';
import '@/styles/globals.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到根挂载节点 #root');
}

initializeAppRuntime().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
