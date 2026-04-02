/**
 * 文件说明：反馈系统上下文与消费 hook。
 * 负责暴露 FeedbackProvider 对外的统一访问入口。
 */
import { createContext, useContext } from 'react';

import type { FeedbackApi } from './feedback-types';

export const FeedbackContext = createContext<FeedbackApi | null>(null);

/**
 * 读取全局反馈 API。
 *
 * @returns 反馈上下文中的通知与聚光灯能力。
 */
export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (context === null) {
    throw new Error('useFeedback 必须在 FeedbackProvider 内调用');
  }

  return context;
}
