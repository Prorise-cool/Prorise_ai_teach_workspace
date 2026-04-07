/**
 * 文件说明：视频讲解输入页容器。
 * 页面容器负责表单装配与提交，公共输入页壳层由共享组件承接。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useCallback, useRef, type FormEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  INPUT_PAGE_GUIDE_CARD_ICONS,
  type InputWorkspaceNavLink,
  type InputWorkspaceRoute,
  useBrowserAsr,
  type GuideCardItem,
  WorkspaceInputShell,
} from '@/components/input-page';
import { VideoInputCard } from '@/features/video/components/video-input-card';
import { VideoPublicFeed } from '@/features/video/components/video-public-feed';
import { useVideoCreate } from '@/features/video/hooks/use-video-create';
import {
  type VideoInputFormValues,
  videoInputFormSchema,
} from '@/features/video/schemas/video-input-schema';
import { useFeedback } from '@/shared/feedback';
import type { VideoPublicCard } from '@/types/video';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/video/styles/video-input-page.scss';

/**
 * 渲染视频讲解输入页。
 *
 * @returns 视频输入页节点。
 */
export function VideoInputPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const form = useForm<VideoInputFormValues>({
    resolver: zodResolver(videoInputFormSchema),
    defaultValues: {
      inputType: 'text',
      text: '',
      imageFiles: [],
    },
    mode: 'onSubmit',
  });
  const createMutation = useVideoCreate();
  const { clearErrors, control, handleSubmit, formState, setValue } = form;

  const { isRecording, toggleRecording } = useBrowserAsr((transcript) => {
    if (transcript) {
      setValue('text', transcript, { shouldValidate: false });
    }
  });
  const imageFiles = useWatch({
    control,
    name: 'imageFiles',
  });
  const navLinks = t('entryNav.landingLinks', {
    returnObjects: true
  }) as InputWorkspaceNavLink[];
  const wsRoutes = t('entryNav.workspaceRoutes', {
    returnObjects: true
  }) as InputWorkspaceRoute[];

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
  const feedEmptyTitle = t('videoInput.feedEmptyTitle');
  const feedEmptyDesc = t('videoInput.feedEmptyDesc');
  const feedErrorTitle = t('videoInput.feedErrorTitle');
  const feedErrorDesc = t('videoInput.feedErrorDesc');
  const feedViewAction = t('videoInput.feedViewAction');
  const feedReuseAction = t('videoInput.feedReuseAction');
  const feedReuseToastTitle = t('videoInput.feedReuseToastTitle');
  const feedReuseToastDesc = t('videoInput.feedReuseToastDesc');

  const guideCardsData = t('videoInput.guideCards', {
    returnObjects: true
  }) as Array<{ title: string; desc: string }>;

  const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
    icon: INPUT_PAGE_GUIDE_CARD_ICONS[i],
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
  const handleReusePublicVideo = useCallback(
    (card: VideoPublicCard) => {
      setValue('text', card.sourceText, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setValue('imageFiles', [], {
        shouldDirty: true,
      });
      setValue('inputType', 'text');
      clearErrors(['text', 'imageFiles']);
      notify({
        title: feedReuseToastTitle,
        description: feedReuseToastDesc,
        tone: 'success',
      });
      if (typeof textareaRef.current?.scrollIntoView === 'function') {
        textareaRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      textareaRef.current?.focus();
    },
    [
      clearErrors,
      feedReuseToastDesc,
      feedReuseToastTitle,
      notify,
      setValue,
    ],
  );

  return (
    <WorkspaceInputShell
      rootClassName="xm-video-input"
      navLinks={navLinks}
      workspaceRoutes={wsRoutes}
      content={{
        as: 'form',
        className: 'xm-video-input__content',
        onSubmit: handlePageSubmit,
        noValidate: true,
      }}
      badgeIcon={Sparkles}
      badgeLabel={badgeLabel}
      titleLine1={titleLine1}
      titleGradient={titleGradient}
      headerClassName="xm-theme-video-header"
      card={
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
          textAreaRef={textareaRef}
        />
      }
      suggestionsLabel={suggestionsLabel}
      suggestions={suggestions}
      onSuggestionSelect={(pill) => {
        setValue('text', pill, { shouldValidate: false });

        if (imageFiles.length === 0) {
          setValue('inputType', 'text');
        }
      }}
      guideCards={guideCards}
      feedTitle={feedTitle}
      feedDescription={feedDesc}
      feedCategories={feedCategories}
      feedCards={[]}
      feedLoadMoreLabel={feedLoadMore}
      feedLoadingLabel={feedLoading}
      feedSlot={
        <VideoPublicFeed
          title={feedTitle}
          description={feedDesc}
          categories={feedCategories}
          emptyTitle={feedEmptyTitle}
          emptyDescription={feedEmptyDesc}
          errorTitle={feedErrorTitle}
          errorDescription={feedErrorDesc}
          viewActionLabel={feedViewAction}
          reuseActionLabel={feedReuseAction}
          onReuseSourceText={handleReusePublicVideo}
        />
      }
    />
  );
}
