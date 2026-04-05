/**
 * 文件说明：视频讲解输入页容器。
 * 对照设计稿 03-视频输入页/01-input.html 还原沉浸式输入区：
 * 标题区 + 核心输入卡片（Textarea + 工具栏 + 提交按钮）+ 建议标签 + 引导卡片。
 * 社区瀑布流由 CommunityFeed 组件独立承接。
 */
import {
  Image,
  PackageSearch,
  Scissors,
  Send,
  ShieldAlert,
  Sparkles,
  WifiOff
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CommunityFeed, VIDEO_FEED_MOCK_CARDS } from '@/components/community-feed';
import {
  InputPageGuideCards,
  InputPageHeader,
  InputPageSuggestions,
  type GuideCardItem
} from '@/components/input-page';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/video/styles/video-input-page.scss';

/** 导航链接类型。 */
type EntryNavLink = {
  href: string;
  label: string;
};

/** 引导卡片图标映射（图标不走 i18n）。 */
const GUIDE_CARD_ICONS = [PackageSearch, ShieldAlert, WifiOff] as const;

/**
 * 渲染视频讲解输入页。
 *
 * @returns 视频输入页节点。
 */
export function VideoInputPage() {
  const { t } = useAppTranslation();
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as EntryNavLink[];

  const badgeLabel = t('videoInput.badgeLabel') as string;
  const titleLine1 = t('videoInput.titleLine1') as string;
  const titleGradient = t('videoInput.titleGradient') as string;
  const placeholder = t('videoInput.placeholder') as string;
  const submitLabel = t('videoInput.submitLabel') as string;
  const toolUploadImage = t('videoInput.toolUploadImage') as string;
  const toolScreenshot = t('videoInput.toolScreenshot') as string;
  const suggestionsLabel = t('videoInput.suggestionsLabel') as string;
  const suggestions = t('videoInput.suggestions', {
    returnObjects: true
  }) as string[];

  const feedTitle = t('videoInput.feedTitle') as string;
  const feedDesc = t('videoInput.feedDesc') as string;
  const feedCategories = t('videoInput.feedCategories', {
    returnObjects: true
  }) as string[];

  const guideCardsData = t('videoInput.guideCards', {
    returnObjects: true
  }) as Array<{ title: string; desc: string }>;

  const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
    icon: GUIDE_CARD_ICONS[i],
    title: card.title,
    desc: card.desc
  }));

  return (
    <main className="xm-video-input">
      <GlobalTopNav
        links={navLinks}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <div className="xm-video-input__content">
        {/* 标题区 */}
        <InputPageHeader
          badgeIcon={Sparkles}
          badgeLabel={badgeLabel}
          titleLine1={titleLine1}
          titleGradient={titleGradient}
        />

        {/* 核心输入卡片 */}
        <div className="xm-video-input__card">
          <div className="xm-video-input__card-body">
            <textarea
              className="xm-video-input__card-textarea"
              placeholder={placeholder}
              rows={3}
            />
          </div>

          <div className="xm-video-input__card-toolbar">
            <div className="xm-video-input__card-tools">
              <button
                type="button"
                className="xm-video-input__card-tool-btn"
                title={toolUploadImage}
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('[VideoInput] 上传图片 - 待接入');
                }}
              >
                <Image className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="xm-video-input__card-tool-btn"
                title={toolScreenshot}
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('[VideoInput] 截图 - 待接入');
                }}
              >
                <Scissors className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              className="xm-video-input__card-submit"
              onClick={() => {
                // eslint-disable-next-line no-console
                console.log('[VideoInput] 生成视频 - 待接入');
              }}
            >
              <span>{submitLabel}</span>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 建议标签 */}
        <InputPageSuggestions
          label={suggestionsLabel}
          pills={suggestions}
          onSelect={(pill) => {
            // eslint-disable-next-line no-console
            console.log(`[VideoInput] 建议: ${pill}`);
          }}
        />
      </div>

      {/* 引导卡片 */}
      <InputPageGuideCards cards={guideCards} />

      {/* 社区瀑布流 */}
      <CommunityFeed
        title={feedTitle}
        description={feedDesc}
        categories={feedCategories}
        cards={VIDEO_FEED_MOCK_CARDS}
      />
    </main>
  );
}
