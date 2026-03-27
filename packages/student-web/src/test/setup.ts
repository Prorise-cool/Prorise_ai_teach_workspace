/**
 * Vitest 全局测试初始化。
 * 统一注册 DOM 断言并在每次测试后清理渲染结果。
 */
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
