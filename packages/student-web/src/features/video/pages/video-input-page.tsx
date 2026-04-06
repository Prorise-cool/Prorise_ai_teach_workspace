/**
 * 文件说明：视频讲解输入页容器。
 * 页面容器负责表单装配、mutation 提交和路由跳转，输入交互下沉到 VideoInputCard。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { PackageSearch, ShieldAlert, Sparkles, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { useCallback, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CommunityFeed, VIDEO_FEED_MOCK_CARDS } from '@/components/community-feed';
import {
  InputPageGuideCards,
  InputPageHeader,
  InputPageSuggestions,
  useBrowserAsr,
  type GuideCardItem,
} from '@/components/input-page';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { VideoInputCard } from '@/features/video/components/video-input-card';
import { useVideoCreate } from '@/features/video/hooks/use-video-create';
import {
  type VideoInputFormValues,
  videoInputFormSchema,
} from '@/features/video/schemas/video-input-schema';

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
  const form = useForm<VideoInputFormValues>({
    resolver: zodResolver(videoInputFormSchema),
    defaultValues: {
      inputType: 'text',
      text: '',
      imageFile: null,
    },
    mode: 'onSubmit',
  });
  const createMutation = useVideoCreate();
  const { control, handleSubmit, formState, setValue } = form;

  const { isRecording, toggleRecording } = useBrowserAsr((transcript) => {
    if (transcript) {
      setValue('text', transcript, { shouldValidate: false });
    }
  });
  const imageFile = useWatch({
    control,
    name: 'imageFile',
  });
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as EntryNavLink[];
  const wsRoutes = t('entryNav.workspaceRoutes', {
    returnObjects: true
  }) as WorkspaceRoute[];

  const badgeLabel = t('videoInput.badgeLabel');
  const titleLine1 = t('videoInput.titleLine1');
  const titleGradient = t('videoInput.titleGradient');
  const placeholder = t('videoInput.placeholder');
  const submitLabel = t('videoInput.submitLabel');
  const smartMatchHint = t('classroomInput.smartMatchHint');
  const smartMatchDesc = t('classroomInput.smartMatchDesc');
  const multiAgentHint = t('classroomInput.multiAgentHint');
  const toolUploadImage = t('videoInput.toolUploadImage');
  const toolVoiceInput = t('classroomInput.toolVoiceInput');
  const suggestionsLabel = t('videoInput.suggestionsLabel');
  const suggestions = t('videoInput.suggestions', {
    returnObjects: true
  }) as string[];

  const feedTitle = t('videoInput.feedTitle');
  const feedDesc = t('videoInput.feedDesc');
  const feedCategories = t('videoInput.feedCategories', {
    returnObjects: true
  }) as string[];
  const feedLoadMore = t('videoInput.feedLoadMore');
  const feedLoading = t('videoInput.feedLoading');

  const guideCardsData = t('videoInput.guideCards', {
    returnObjects: true
  }) as Array<{ title: string; desc: string }>;

  const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
    icon: GUIDE_CARD_ICONS[i],
    title: card.title,
    desc: card.desc
  }));

  const onFormSubmit = useCallback(
    (values: VideoInputFormValues) => {
      createMutation.mutate(values);
    },
    [createMutation],
  );
  const handlePageSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void handleSubmit(onFormSubmit)(event);
    },
    [handleSubmit, onFormSubmit],
  );

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

      <form
        className="xm-video-input__content"
        onSubmit={handlePageSubmit}
        noValidate
      >
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
        <motion.div variants={itemVariants}>
          <VideoInputCard
            form={form}
            errors={formState.errors}
            isSubmitting={createMutation.isPending}
            isRecording={isRecording}
            onToggleRecording={toggleRecording}
            labels={{
              smartMatchHint,
              smartMatchDesc,
              multiAgentHint,
              placeholder,
              submitLabel,
              toolUploadImage,
              toolVoiceInput,
            }}
          />
        </motion.div>

        {/* 建议标签 */}
        <motion.div variants={itemVariants}>
          <InputPageSuggestions
            label={suggestionsLabel}
            pills={suggestions}
            onSelect={(pill) => {
              setValue('text', pill, { shouldValidate: false });

              if (!imageFile) {
                setValue('inputType', 'text');
              }
            }}
          />
        </motion.div>
      </form>

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
