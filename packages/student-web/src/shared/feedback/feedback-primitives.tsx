/**
 * 文件说明：反馈组件基础图形原语。
 * 负责根据反馈语气渲染统一的状态图标。
 */
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  XCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type { FeedbackTone } from './feedback-types';

type FeedbackGlyphProps = {
  tone: FeedbackTone;
  loading?: boolean;
  className?: string;
};

/**
 * 渲染反馈图标。
 *
 * @param props - 图标参数。
 * @returns 对应语气的图标节点。
 */
export function FeedbackGlyph({
  tone,
  loading = false,
  className
}: FeedbackGlyphProps) {
  if (loading) {
    return (
      <LoaderCircle
        aria-hidden="true"
        className={cn('xm-feedback-glyph is-loading', className)}
      />
    );
  }

  if (tone === 'success') {
    return (
      <CheckCircle2
        aria-hidden="true"
        className={cn('xm-feedback-glyph', className)}
      />
    );
  }

  if (tone === 'warning') {
    return (
      <AlertTriangle
        aria-hidden="true"
        className={cn('xm-feedback-glyph', className)}
      />
    );
  }

  if (tone === 'error') {
    return (
      <XCircle
        aria-hidden="true"
        className={cn('xm-feedback-glyph', className)}
      />
    );
  }

  return (
    <Info
      aria-hidden="true"
      className={cn('xm-feedback-glyph', className)}
    />
  );
}
