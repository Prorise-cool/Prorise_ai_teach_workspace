/**
 * 文件说明：视频等待页富文本渲染组件。
 *
 * 实现已抽到 `@/components/rich-content`（跨场景复用，quiz 也走同一套）；
 * 本文件保留 re-export 以不破坏现有调用点（`video-generating-preview-player.tsx`
 * 与 `video-generating-stage-content.tsx`）。
 */
import { RichBlock, type RichBlockProps } from '@/components/rich-content';

export type VideoGeneratingRichContentProps = RichBlockProps;

export const VideoGeneratingRichContent = RichBlock;
