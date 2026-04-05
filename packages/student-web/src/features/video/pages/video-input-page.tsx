/**
 * 文件说明：视频讲解输入页容器。
 * 对照设计稿 03-视频输入页/01-input.html 还原沉浸式输入区：
 * 标题区 + 核心输入卡片（Textarea + 工具栏 + 提交按钮）+ 建议标签 + 引导卡片。
 * 社区瀑布流由 CommunityFeed 组件独立承接。
 */
import {
  FileText,
  Image,
  Mic,
  PackageSearch,
  Send,
  ShieldAlert,
  Sparkles,
  WifiOff,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CommunityFeed, VIDEO_FEED_MOCK_CARDS } from '@/components/community-feed';
import {
  InputPageGuideCards,
  InputPageHeader,
  InputPageSuggestions,
  useFileDropzone,
  useBrowserAsr,
  type GuideCardItem
} from '@/components/input-page';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { cn } from '@/lib/utils';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/video/styles/video-input-page.scss';

/** 导航链接类型。 */
type EntryNavLink = {
  href: string;
  label: string;
};

/** 工作区路由类型。 */
type WorkspaceRoute = {
  href: string;
  label: string;
  icon: string;
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
  const [text, setText] = useState('');

  const { 
    isDragging, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop,
    attachedFile,
    clearFile,
    triggerSelect,
    fileInputRef,
    handleFileChange 
  } = useFileDropzone();

  const { isRecording, toggleRecording } = useBrowserAsr((transcript) => {
    if (transcript) setText(transcript);
  });
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as EntryNavLink[];
  const wsRoutes = t('entryNav.workspaceRoutes', {
    returnObjects: true
  }) as WorkspaceRoute[];

  const badgeLabel = t('videoInput.badgeLabel') as string;
  const titleLine1 = t('videoInput.titleLine1') as string;
  const titleGradient = t('videoInput.titleGradient') as string;
  const placeholder = t('videoInput.placeholder') as string;
  const submitLabel = t('videoInput.submitLabel') as string;
  const smartMatchHint = t('classroomInput.smartMatchHint') as string;
  const smartMatchDesc = t('classroomInput.smartMatchDesc') as string;
  const multiAgentHint = t('classroomInput.multiAgentHint') as string;
  const toolUploadImage = t('videoInput.toolUploadImage') as string;
  const toolVoiceInput = t('classroomInput.toolVoiceInput') as string;
  const suggestionsLabel = t('videoInput.suggestionsLabel') as string;
  const suggestions = t('videoInput.suggestions', {
    returnObjects: true
  }) as string[];

  const feedTitle = t('videoInput.feedTitle') as string;
  const feedDesc = t('videoInput.feedDesc') as string;
  const feedCategories = t('videoInput.feedCategories', {
    returnObjects: true
  }) as string[];
  const feedLoadMore = t('videoInput.feedLoadMore') as string;
  const feedLoading = t('videoInput.feedLoading') as string;

  const guideCardsData = t('videoInput.guideCards', {
    returnObjects: true
  }) as Array<{ title: string; desc: string }>;

  const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
    icon: GUIDE_CARD_ICONS[i],
    title: card.title,
    desc: card.desc
  }));

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: 20, filter: 'blur(8px)', scale: 0.98 },
    visible: { 
      opacity: 1, 
      x: 0, 
      filter: 'blur(0px)', 
      scale: 1, 
      transition: { type: 'spring', bounce: 0, duration: 0.7 } 
    }
  };

  return (
    <motion.main 
      className="xm-video-input"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 顶部导航区全局高光 */}
      <div 
        className="absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10" 
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% -10%, var(--xm-color-primary) 0%, transparent 100%)',
          opacity: 0.25,
          mixBlendMode: 'color-dodge'
        }}
      />

      <GlobalTopNav
        links={navLinks}
        variant="workspace"
        workspaceRoutes={wsRoutes}
        showAuthAction
        showBrandIcon
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <div className="xm-video-input__content">
        {/* 标题区 */}
        <motion.div variants={itemVariants}>
          <InputPageHeader
            className="xm-theme-video-header"
            badgeIcon={Sparkles}
            badgeLabel={badgeLabel}
            titleLine1={titleLine1}
            titleGradient={titleGradient}
          />
        </motion.div>

        {/* 核心输入卡片 */}
        <motion.div variants={itemVariants} className="xm-video-input__card">
          {/* 智能匹配提示栏 */}
          <div className="xm-video-input__card-hints">
            <div className="xm-video-input__card-hint xm-video-input__card-hint--accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{smartMatchHint}</span>
              <span className="xm-video-input__card-hint-desc">
                {smartMatchDesc}
              </span>
            </div>
            <div className="xm-video-input__card-hint">
              <span>{multiAgentHint}</span>
            </div>
          </div>

          <div 
            className="xm-video-input__card-body relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 m-3 flex flex-col items-center justify-center rounded-[var(--xm-radius-md)] bg-[color:var(--xm-color-surface-glass)] backdrop-blur-sm border-2 border-dashed border-primary">
                <p className="text-sm font-semibold text-primary">松开鼠标，上传参考文件</p>
              </div>
            )}

            {/* 附件预览区 */}
            {attachedFile && (
              <div className="flex items-center justify-between rounded-lg bg-[color:var(--xm-color-surface-sunken)] p-3 border border-[color:var(--xm-color-border-subtle)]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[color:var(--xm-color-surface-highest)]">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium text-foreground">
                      {attachedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={clearFile}
                  title="取消引用"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <textarea
              className="xm-video-input__card-textarea"
              placeholder={placeholder}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="xm-video-input__card-toolbar">
            <div className="xm-video-input__card-tools">
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="xm-video-input__card-tool-btn"
                title={toolUploadImage}
                onClick={triggerSelect}
              >
                <Image className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={cn(
                  'xm-video-input__card-tool-btn relative',
                  isRecording && 'text-primary bg-[color:var(--xm-color-brand-50)]'
                )}
                title={toolVoiceInput}
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <div className="flex items-center justify-center gap-[2px] h-4 w-4">
                    <span className="w-[2px] h-2 bg-current rounded-full animate-audio-bar-1" />
                    <span className="w-[2px] h-4 bg-current rounded-full animate-audio-bar-2" />
                    <span className="w-[2px] h-3 bg-current rounded-full animate-audio-bar-3" />
                  </div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isRecording && (
                  <span className="absolute inset-0 rounded-md bg-[color:var(--xm-color-brand-500)] opacity-20 animate-ping" />
                )}
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
        </motion.div>

        {/* 建议标签 */}
        <motion.div variants={itemVariants}>
          <InputPageSuggestions
            label={suggestionsLabel}
            pills={suggestions}
            onSelect={(pill) => {
              // eslint-disable-next-line no-console
              console.log(`[VideoInput] 建议: ${pill}`);
            }}
          />
        </motion.div>
      </div>

      {/* 引导卡片 */}
      <motion.div variants={itemVariants}>
        <InputPageGuideCards cards={guideCards} />
      </motion.div>

      {/* 社区瀑布流 */}
      <motion.div variants={itemVariants}>
        <CommunityFeed
          title={feedTitle}
          description={feedDesc}
          categories={feedCategories}
          cards={VIDEO_FEED_MOCK_CARDS}
          loadMoreLabel={feedLoadMore}
          loadingLabel={feedLoading}
        />
      </motion.div>
    </motion.main>
  );
}
