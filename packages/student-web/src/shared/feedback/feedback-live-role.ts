/**
 * 文件说明：反馈组件的可访问性 role 解析。
 * 根据反馈语气决定更合适的屏幕阅读器播报语义。
 */
import type { FeedbackTone } from './feedback-types';

/**
 * 解析反馈元素的 `role`。
 *
 * @param tone - 当前反馈语气。
 * @returns 对应的 ARIA live role。
 */
export function resolveFeedbackLiveRole(tone: FeedbackTone) {
  return tone === 'error' ? 'alert' : 'status';
}
