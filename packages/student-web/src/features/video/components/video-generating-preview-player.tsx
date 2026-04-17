/**
 * 文件说明：视频等待页 Stage 5 渲染流专属视图。
 * 复刻设计稿中的「主播放器 + 横向轨道 + 底部详情」结构，并继续复用现有 VideoPlayer 与状态徽标。
 */
import { Loader2, Radio, Wand2 } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import type { VideoPreviewSection } from '@/types/video';

import { VideoPlayer } from './video-player';
import { VideoGeneratingRichContent } from './video-generating-rich-content';
import { VideoPreviewSectionBadge } from './video-preview-section-badge';

export interface VideoGeneratingPreviewPlayerProps {
  sections: VideoPreviewSection[];
  totalSections: number;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  previewAvailable: boolean;
  isRefreshing: boolean;
}

type TrackEntry = {
  sectionId: string;
  sectionIndex: number;
  status: VideoPreviewSection['status'];
  title: string;
  isPlaceholder: boolean;
};

function createPlaceholderTracks(
  totalSections: number,
  buildTitle: (index: number) => string,
): TrackEntry[] {
  return Array.from({ length: Math.max(totalSections, 4) }, (_, index) => ({
    sectionId: `placeholder_${index + 1}`,
    sectionIndex: index,
    status: 'pending' as const,
    title: buildTitle(index),
    isPlaceholder: true,
  }));
}

/**
 * 渲染等待页的流式预览播放器。
 *
 * @param props - 当前 section 列表与选中状态。
 * @returns 与设计稿对齐的渲染流视图。
 */
export function VideoGeneratingPreviewPlayer({
  sections,
  totalSections,
  selectedSectionId,
  onSelectSection,
  previewAvailable,
  isRefreshing,
}: VideoGeneratingPreviewPlayerProps) {
  const { t } = useAppTranslation();
  const resolveSectionExplanation = (section: VideoPreviewSection | null) =>
    section?.lectureLines
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n\n') ?? '';
  const selectedSection =
    sections.find((section) => section.sectionId === selectedSectionId) ??
    sections.find((section) => section.status === 'ready') ??
    sections[0] ??
    null;
  const readyCount = sections.filter((section) => section.status === 'ready').length;
  const trackEntries =
    sections.length > 0
      ? sections.map((section) => ({
          sectionId: section.sectionId,
          sectionIndex: section.sectionIndex,
          status: section.status,
          title: section.title,
          isPlaceholder: false,
        }))
      : createPlaceholderTracks(totalSections, (index) =>
          t('video.generating.sectionFallbackTitle', { index: index + 1 }),
        );

  const overlayState = selectedSection?.status ?? 'pending';
  const showOverlay = !selectedSection?.clipUrl;

  return (
    <div className="xm-generating-player">
      <div className="xm-generating-player__screen">
        {selectedSection?.clipUrl ? (
          <VideoPlayer
            videoUrl={selectedSection.clipUrl}
            className="xm-generating-player__video"
          />
        ) : (
          <div className="xm-generating-player__empty-layer" />
        )}

        <div className="xm-generating-player__gradient" />

        <div className="xm-generating-player__heading">
          <span className="xm-generating-player__stream-tag">
            {t('video.generating.player.streamLabel')}
          </span>
          <h4 className="xm-generating-player__scene-title">
            {selectedSection?.title || t('video.generating.player.waitingTitle')}
          </h4>
        </div>

        {showOverlay ? (
          <div className="xm-generating-player__overlay">
            <div className="xm-generating-player__overlay-icon">
              {overlayState === 'fixing' ? (
                <Wand2 className="h-7 w-7 text-warning" />
              ) : overlayState === 'failed' ? (
                <Radio className="h-7 w-7 text-destructive" />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              )}
            </div>
            <p className="xm-generating-player__overlay-text">
              {overlayState === 'fixing'
                ? t('video.generating.player.overlayFixing')
                : overlayState === 'failed'
                  ? t('video.generating.player.overlayFailed')
                  : t('video.generating.player.overlayGenerating')}
            </p>
          </div>
        ) : null}
      </div>

      <div className="xm-generating-player__tracks">
        <div className="xm-generating-player__tracks-head">
          <span>{t('video.generating.player.tracksLabel')}</span>
          <span>
            {t('video.generating.sectionCount', {
              ready: readyCount,
              total: totalSections,
            })}
          </span>
        </div>

        <div className="xm-generating-player__tracks-strip">
          {trackEntries.map((entry) => {
            const isActive = entry.sectionId === selectedSection?.sectionId;

            return (
              <button
                key={entry.sectionId}
                type="button"
                title={entry.title}
                disabled={entry.isPlaceholder}
                onClick={() => {
                  if (!entry.isPlaceholder) {
                    onSelectSection(entry.sectionId);
                  }
                }}
                className={cn(
                  'xm-generating-player__track',
                  `is-${entry.status}`,
                  isActive && 'is-active',
                  entry.isPlaceholder && 'is-placeholder',
                )}
              >
                <span className="sr-only">{entry.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="xm-generating-player__details">
        <div className="xm-generating-player__details-card">
          <div className="xm-generating-player__details-head">
            <div className="space-y-2">
              <h4 className="xm-generating-player__details-title">
                {selectedSection?.title || t('video.generating.player.waitingTitle')}
              </h4>
              {selectedSection ? (
                <VideoPreviewSectionBadge status={selectedSection.status} />
              ) : null}
            </div>
            {isRefreshing ? (
              <span className="xm-generating-player__refreshing">
                {t('video.generating.previewRefreshing')}
              </span>
            ) : null}
          </div>

          <div className="xm-generating-player__detail-row">
            <span className="xm-generating-player__detail-label">
              {t('video.generating.scriptLabels.narration')}
            </span>
            <VideoGeneratingRichContent
              className="xm-generating-player__quote-box"
              content={resolveSectionExplanation(selectedSection)}
              placeholder={t('video.generating.player.waitingNarration')}
            />
          </div>

          {selectedSection?.audioUrl ? (
            <div className="xm-generating-player__detail-row">
              <span className="xm-generating-player__detail-label">
                {t('video.generating.scriptLabels.audio')}
              </span>
              <audio
                className="xm-generating-player__audio"
                controls
                preload="none"
                src={selectedSection.audioUrl}
              >
                {t('video.generating.audioPreview')}
              </audio>
            </div>
          ) : null}

          {!previewAvailable && !sections.length ? (
            <p className="xm-generating-player__footnote">
              {t('video.generating.player.waitingPreview')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
