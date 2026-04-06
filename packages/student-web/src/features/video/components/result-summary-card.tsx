/**
 * 文件说明：视频结果摘要卡片（Story 4.8）。
 * 展示题目摘要、知识点列表与 AI 内容标识。
 */
import { Bot, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ResultSummaryCardProps {
  /** 视频标题。 */
  title: string;
  /** 摘要文本。 */
  summary: string;
  /** 知识点列表。 */
  knowledgePoints: string[];
  /** 视频时长（秒）。 */
  duration: number;
  /** AI 内容标识。 */
  aiContentFlag: boolean;
  /** 额外 className。 */
  className?: string;
}

/**
 * 格式化视频时长。
 *
 * @param seconds - 秒数。
 * @returns 格式化后的时长文本。
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 渲染视频结果摘要卡片。
 *
 * @param props - 摘要卡片属性。
 * @returns 摘要卡片 UI。
 */
export function ResultSummaryCard({
  title,
  summary,
  knowledgePoints,
  duration,
  aiContentFlag,
  className,
}: ResultSummaryCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* AI 内容标识 */}
      {aiContentFlag && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bot className="w-3.5 h-3.5" />
          <span>AI 生成内容</span>
        </div>
      )}

      {/* 标题 */}
      <h1 className="text-xl font-bold text-foreground">{title}</h1>

      {/* 时长 */}
      <p className="text-sm text-muted-foreground">
        时长 {formatDuration(duration)}
      </p>

      {/* 摘要 */}
      <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>

      {/* 知识点 */}
      {knowledgePoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            知识点
          </h3>
          <div className="flex flex-wrap gap-2">
            {knowledgePoints.map((point) => (
              <span
                key={point}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
