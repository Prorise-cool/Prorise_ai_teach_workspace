/**
 * 文件说明：视频等待页右侧动态内容区。
 * 按设计稿的 6 段式导航切换不同内容，Stage 5 使用播放器视图，其余阶段展示摘要、步骤、分镜和资源状态。
 */
import {
  Boxes,
  Check,
  Clapperboard,
  Film,
  Layers3,
  ListTree,
  Sparkles,
  Waves,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import type {
  VideoPreviewSection,
  VideoTaskPreview,
} from '@/types/video';

import type { VideoGeneratingLayoutStageKey } from '../config/video-generating-layout';

import { VideoGeneratingPreviewPlayer } from './video-generating-preview-player';
import { VideoPreviewSectionBadge } from './video-preview-section-badge';

const STAGE_ICON_MAP = {
  summary: Sparkles,
  steps: ListTree,
  storyboard: Clapperboard,
  assets: Boxes,
  renderFlow: Film,
  compose: Check,
} as const;

export interface VideoGeneratingStageContentProps {
  stageKey: VideoGeneratingLayoutStageKey;
  status: VideoTaskPreview['status'] | 'pending';
  previewAvailable: boolean;
  summary: string;
  knowledgePoints: string[];
  sections: VideoPreviewSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  totalSections: number;
  readySections: number;
  isRefreshing: boolean;
}

function buildStepItems(
  sections: VideoPreviewSection[],
  knowledgePoints: string[],
) {
  if (sections.length > 0) {
    return sections.map((section, index) => ({
      id: section.sectionId,
      title: section.title,
      description:
        section.lectureLines[0] || knowledgePoints[index] || '',
    }));
  }

  return knowledgePoints.map((point, index) => ({
    id: point,
    title: point,
    description: point,
  }));
}

/**
 * 渲染等待页右侧阶段内容。
 *
 * @param props - 当前展示阶段与预览数据。
 * @returns 右侧主内容区。
 */
export function VideoGeneratingStageContent({
  stageKey,
  status,
  previewAvailable,
  summary,
  knowledgePoints,
  sections,
  selectedSectionId,
  onSelectSection,
  totalSections,
  readySections,
  isRefreshing,
}: VideoGeneratingStageContentProps) {
  const { t } = useAppTranslation();
  const StageIcon = STAGE_ICON_MAP[stageKey];
  const audioReadyCount = sections.filter((section) => section.audioUrl).length;
  const failedCount = sections.filter((section) => section.status === 'failed').length;
  const stepItems = buildStepItems(sections, knowledgePoints).slice(0, 6);

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
              <p className="xm-generating-stage-card__copy">
                {summary || t('video.generating.previewUnavailable')}
              </p>
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

        {stageKey === 'steps' ? (
          <div className="xm-generating-stage-timeline">
            {stepItems.map((item, index) => (
              <article key={item.id} className="xm-generating-stage-timeline__item">
                <div
                  className={cn(
                    'xm-generating-stage-timeline__dot',
                    index === 0 && 'is-primary',
                  )}
                />
                <div className="space-y-1">
                  <h4 className="xm-generating-stage-timeline__title">
                    {item.title || t('video.generating.sectionFallbackTitle', { index: index + 1 })}
                  </h4>
                  <p className="xm-generating-stage-timeline__desc">
                    {item.description || t('video.generating.previewUnavailable')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {stageKey === 'storyboard' ? (
          <div className="xm-generating-stage-stack">
            {sections.length > 0 ? (
              sections.map((section) => (
                <article key={section.sectionId} className="xm-generating-storyboard-card">
                  <div className="xm-generating-storyboard-card__head">
                    <div>
                      <h4 className="xm-generating-storyboard-card__title">
                        {section.title || t('video.generating.sectionFallbackTitle', {
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
                    <p className="xm-generating-storyboard-card__quote">
                      {section.lectureLines[0] || t('video.generating.previewUnavailable')}
                    </p>
                  </div>

                  <div className="xm-generating-storyboard-card__row">
                    <span className="xm-generating-storyboard-card__label">
                      {t('video.generating.scriptLabels.visual')}
                    </span>
                    <div className="xm-generating-storyboard-card__notes">
                      {(section.visualNotes?.length ? section.visualNotes : []).map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                      {!section.visualNotes?.length && (
                        <p>{t('video.generating.visualPending')}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="xm-generating-stage-empty-card">
                {t('video.generating.previewUnavailable')}
              </div>
            )}
          </div>
        ) : null}

        {stageKey === 'assets' ? (
          <div className="xm-generating-assets-stage">
            <div className="xm-generating-assets-stage__hero">
              <Waves className="h-10 w-10 text-primary" />
              <h4>{t('video.generating.stageCards.assets.heroTitle')}</h4>
              <p>{t('video.generating.stageCards.assets.heroDescription')}</p>
            </div>
            <div className="xm-generating-assets-stage__stats">
              <div className="xm-generating-assets-stage__stat">
                <span>{t('video.generating.assetStats.audioReady')}</span>
                <strong>{audioReadyCount}</strong>
              </div>
              <div className="xm-generating-assets-stage__stat">
                <span>{t('video.generating.assetStats.previewReady')}</span>
                <strong>{readySections}</strong>
              </div>
              <div className="xm-generating-assets-stage__stat">
                <span>{t('video.generating.assetStats.failedSections')}</span>
                <strong>{failedCount}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {stageKey === 'compose' ? (
          <div className="xm-generating-compose-stage">
            <div className="xm-generating-compose-stage__badge">
              <Check className="h-7 w-7" />
            </div>
            <h4>
              {status === 'completed'
                ? t('video.generating.stageCards.compose.completedTitle')
                : t('video.generating.stageCards.compose.heroTitle')}
            </h4>
            <p>
              {status === 'completed'
                ? t('video.generating.stageCards.compose.completedDescription')
                : t('video.generating.stageCards.compose.heroDescription')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
