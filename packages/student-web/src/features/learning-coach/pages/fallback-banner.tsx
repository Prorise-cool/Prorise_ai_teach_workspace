/**
 * 文件说明：Learning Coach 降级提示条（Epic 8 后续修复）。
 *
 * 当后端 payload.generationSource === 'fallback' 时，说明 LLM 出题/路径规划
 * 服务暂不可用，后端返回了通用占位内容。为避免用户误以为这是针对其学习内容
 * 的个性化结果，在对应页面顶部持续展示黄色警示条提示降级状态。
 */
import { AlertTriangle } from 'lucide-react';

export type FallbackBannerMode = 'quiz' | 'checkpoint' | 'path';

const MESSAGES: Record<FallbackBannerMode, string> = {
  quiz: 'AI 出题服务暂不可用，当前是通用学习反思题，可稍后重试获取针对性题目',
  checkpoint: 'AI 出题服务暂不可用，当前是通用学习反思题，可稍后重试获取针对性题目',
  path: 'AI 路径规划暂不可用，当前是基线模板，可稍后重试',
};

export function FallbackBanner({ mode }: { mode: FallbackBannerMode }) {
  const message = MESSAGES[mode];
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 shadow-sm"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <p className="text-[13px] font-medium leading-relaxed text-text-primary dark:text-text-primary-dark">
        {message}
      </p>
    </div>
  );
}
