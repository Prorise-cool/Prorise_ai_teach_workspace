/**
 * 文件说明：视频讲解输入页容器。
 * 对照设计稿 03-视频输入页/01-input.html 还原沉浸式输入区：
 * 标题区 + 核心输入卡片（Textarea + 工具栏 + 提交按钮）+ 建议标签 + 引导卡片。
 * 页面容器只负责路由参数、表单 submit 和导航跳转；
 * 输入交互下沉到 VideoInputCard 子组件。
 * 社区瀑布流由 CommunityFeed 组件独立承接。
 */
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PackageSearch, ShieldAlert, Sparkles, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';

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
import { cn } from '@/lib/utils';
import { VideoInputCard } from '@/features/video/components/video-input-card';
import { useVideoCreate } from '@/features/video/hooks/use-video-create';
import {
  videoInputFormSchema,
  type VideoInputFormValues,
} from '@/features/video/schemas/video-input-schema';
import type {
  CreateVideoTaskRequest,
  VideoTextSourcePayload,
  VideoImageSourcePayload,
} from '@/types/video';

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

/** 容器级入场动画 variants。 */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** 子元素级入场动画 variants。 */
const itemVariants: Variants = {
  hidden: { opacity: 0, x: 20, filter: 'blur(8px)', scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: { type: 'spring', bounce: 0, duration: 0.7 },
  },
};

/**
 * 将表单值转换为视频任务创建请求体。
 *
 * @param values - 表单数据。
 * @returns 视频任务创建请求。
 */
function buildCreateVideoTaskRequest(
  values: VideoInputFormValues,
): CreateVideoTaskRequest {
  if (values.inputType === 'image' && values.imageFile) {
    const sourcePayload: VideoImageSourcePayload = {
      imageRef: URL.createObjectURL(values.imageFile),
      fileName: values.imageFile.name,
      fileSize: values.imageFile.size,
      mimeType: values.imageFile.type,
      ocrText: values.text || undefined,
    };

    return {
      inputType: 'image',
      sourcePayload,
    };
  }

  const sourcePayload: VideoTextSourcePayload = {
    text: values.text,
  };

  return {
    inputType: 'text',
    sourcePayload,
  };
}

/**
 * 渲染视频讲解输入页。
 * 使用 react-hook-form + zod 管理表单校验，
 * useMutation 管理提交状态，成功后跳转等待页。
 *
 * @returns 视频输入页节点。
 */
export function VideoInputPage() {
  const { t } = useAppTranslation();

  /* ---------- 表单管理 ---------- */
  const form = useForm<VideoInputFormValues>({
    resolver: zodResolver(videoInputFormSchema),
    defaultValues: {
      inputType: 'text',
      text: '',
      imageFile: null,
    },
    mode: 'onSubmit',
  });

  const { handleSubmit, formState, setValue } = form;

  /* ---------- 提交 mutation ---------- */
  const createMutation = useVideoCreate();

  /**
   * 表单提交处理器。
   * 校验通过后构建请求体并调用 mutation。
   */
  const onFormSubmit = useCallback(
    (values: VideoInputFormValues) => {
      const request = buildCreateVideoTaskRequest(values);
      createMutation.mutate(request);
    },
    [createMutation],
  );

  /* ---------- 语音输入 ---------- */
  const { isRecording, toggleRecording } = useBrowserAsr((transcript) => {
    if (transcript) {
      setValue('text', transcript, { shouldValidate: false });
    }
  });

  /* ---------- i18n 文案 ---------- */
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true,
  }) as EntryNavLink[];
  const wsRoutes = t('entryNav.workspaceRoutes', {
    returnObjects: true,
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
    returnObjects: true,
  }) as string[];

  const feedTitle = t('videoInput.feedTitle') as string;
  const feedDesc = t('videoInput.feedDesc') as string;
  const feedCategories = t('videoInput.feedCategories', {
    returnObjects: true,
  }) as string[];
  const feedLoadMore = t('videoInput.feedLoadMore') as string;
  const feedLoading = t('videoInput.feedLoading') as string;

  const guideCardsData = t('videoInput.guideCards', {
    returnObjects: true,
  }) as Array<{ title: string; desc: string }>;

  const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
    icon: GUIDE_CARD_ICONS[i],
    title: card.title,
    desc: card.desc,
  }));

  return (
    <motion.main
      className={cn('xm-video-input')}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 顶部导航区全局高光 */}
      <div
        className={cn(
          'absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10',
        )}
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, var(--xm-color-primary) 0%, transparent 100%)',
          opacity: 0.25,
          mixBlendMode: 'color-dodge',
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
        onSubmit={handleSubmit(onFormSubmit)}
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
            onSubmit={handleSubmit(onFormSubmit)}
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
              setValue('inputType', 'text');
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
