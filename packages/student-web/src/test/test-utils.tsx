/**
 * 测试渲染工具。
 * 为测试文件提供统一的渲染入口，后续若引入 provider 可在这里集中扩展。
 */
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

export function renderWithProviders(ui: ReactNode) {
  return render(ui)
}
