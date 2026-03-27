/**
 * 前端入口文件。
 * 负责挂载全局样式与 React 根节点，后续正式页面替换时仍复用同一启动边界。
 */
import '@/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element "#root" was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
