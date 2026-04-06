/**
 * 文件说明：视频讲解输入页容器。
 * 页面容器负责表单装配与提交，公共输入页壳层由共享组件承接。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useCallback, type FormEvent } from 'react';
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
import { VIDEO_FEED_MOCK_CARDS } from '@/components/community-feed';
import { VideoInputCard } from '@/features/video/components/video-input-card';
import { useVideoCreate } from '@/features/video/hooks/use-video-create';
import {
  type VideoInputFormValues,
  videoInputFormSchema,
} from '@/features/video/schemas/video-input-schema';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/video/styles/video-input-page.scss';

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
      imageFiles: [],
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
      feedCards={VIDEO_FEED_MOCK_CARDS}
      feedLoadMoreLabel={feedLoadMore}
      feedLoadingLabel={feedLoading}
    />
  );
}
