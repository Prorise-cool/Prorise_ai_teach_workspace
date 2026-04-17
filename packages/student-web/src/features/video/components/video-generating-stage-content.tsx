/**
 * 文件说明：视频等待页右侧动态内容区。
 * 仅保留 3 个真正可消费的阶段：摘要、分段讲解信息、分段预览。
 */
import {
  Clapperboard,
  Film,
  Layers3,
  Sparkles,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { VideoPreviewSection } from '@/types/video';

import type { VideoGeneratingLayoutStageKey } from '../config/video-generating-layout';

import { VideoGeneratingPreviewPlayer } from './video-generating-preview-player';
import { VideoPreviewSectionBadge } from './video-preview-section-badge';
import { VideoGeneratingRichContent } from './video-generating-rich-content';

const STAGE_ICON_MAP = {
  summary: Sparkles,
  storyboard: Clapperboard,
  renderFlow: Film,
} as const;

export interface VideoGeneratingStageContentProps {
  stageKey: VideoGeneratingLayoutStageKey;
  previewAvailable: boolean;
  summary: string;
  knowledgePoints: string[];
  sections: VideoPreviewSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  totalSections: number;
  isRefreshing: boolean;
}

/**
 * 渲染等待页右侧阶段内容。
 *
 * @param props - 当前展示阶段与预览数据。
 * @returns 右侧主内容区。
 */
export function VideoGeneratingStageContent({
  stageKey,
  previewAvailable,
  summary,
  knowledgePoints,
  sections,
  selectedSectionId,
  onSelectSection,
  totalSections,
  isRefreshing,
}: VideoGeneratingStageContentProps) {
  const { t } = useAppTranslation();
  const StageIcon = STAGE_ICON_MAP[stageKey];
  const resolveSectionExplanation = (section: VideoPreviewSection) =>
    section.lectureLines
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n\n');

  if (stageKey === 'renderFlow') {
    return (
      <VideoGeneratingPreviewPlayer
        sections={sections}
        totalSections={totalSections}
        selectedSectionId={selectedSectionId}
        onSelectSection={onSelectSection}
        previewAvailable={previewAvailable}
        isRefreshing={isRefreshing}
      />
    );
  }

  return (
    <div className="xm-generating-stage-view">
      <div className="xm-generating-stage-view__scroll">
        <div className="xm-generating-stage-view__header">
          <div className="xm-generating-stage-view__icon">
            <StageIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="xm-generating-stage-view__title">
              {t(`video.generating.stageCards.${stageKey}.title`)}
            </h3>
            <p className="xm-generating-stage-view__description">
              {t(`video.generating.stageCards.${stageKey}.description`)}
            </p>
          </div>
        </div>

        {stageKey === 'summary' ? (
          <div className="xm-generating-stage-stack">
            <article className="xm-generating-stage-card">
              <div className="xm-generating-stage-card__subhead">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{t('video.generating.stageCards.summary.heroTitle')}</span>
              </div>
              <VideoGeneratingRichContent
                className="xm-generating-stage-card__copy"
                content={summary}
                placeholder={t('video.generating.previewUnavailable')}
              />
            </article>
            <article className="xm-generating-stage-card">
              <div className="xm-generating-stage-card__subhead">
                <Layers3 className="h-4 w-4 text-primary" />
                <span>{t('video.common.knowledgePoints')}</span>
              </div>
              <div className="xm-generating-stage-pills">
                {knowledgePoints.length > 0 ? (
                  knowledgePoints.map((point) => (
                    <span key={point} className="xm-generating-stage-pill">
                      {point}
                    </span>
                  ))
                ) : (
                  <span className="xm-generating-stage-empty">
                    {t('video.generating.previewUnavailable')}
                  </span>
                )}
              </div>
            </article>
          </div>
        ) : null}

        {stageKey === 'storyboard' ? (
          <div className="xm-generating-stage-stack">
            {sections.length > 0 ? (
              sections.map((section) => (
                <article key={section.sectionId} className="xm-generating-storyboard-card">
                  <div className="xm-generating-storyboard-card__head">
                    <div>
                      <p className="xm-generating-storyboard-card__eyebrow">
                        {t('video.generating.sectionFallbackTitle', {
                          index: section.sectionIndex + 1,
                        })}
                      </p>
                      <h4 className="xm-generating-storyboard-card__title">
                        {section.title ||
                          t('video.generating.sectionFallbackTitle', {
                            index: section.sectionIndex + 1,
                          })}
                      </h4>
                    </div>
                    <VideoPreviewSectionBadge status={section.status} />
                  </div>

                  <div className="xm-generating-storyboard-card__row">
                    <span className="xm-generating-storyboard-card__label">
                      {t('video.generating.scriptLabels.narration')}
                    </span>
                    <VideoGeneratingRichContent
                      className="xm-generating-storyboard-card__quote"
                      content={resolveSectionExplanation(section)}
                      placeholder={t('video.generating.previewUnavailable')}
                    />
                  </div>

                  {section.audioUrl ? (
                    <div className="xm-generating-storyboard-card__row">
                      <span className="xm-generating-storyboard-card__label">
                        {t('video.generating.scriptLabels.audio')}
                      </span>
                      <audio
                        className="xm-generating-player__audio"
                        controls
                        preload="none"
                        src={section.audioUrl}
                      >
                        {t('video.generating.audioPreview')}
                      </audio>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="xm-generating-stage-empty-card">
                {t('video.generating.previewUnavailable')}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
