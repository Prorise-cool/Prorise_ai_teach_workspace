/**
 * 文件说明：视频讲解输入页容器。
 * 页面容器负责表单装配与提交，公共输入页壳层由共享组件承接。
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { type FormEvent, useCallback, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
	type GuideCardItem,
	INPUT_PAGE_GUIDE_CARD_ICONS,
	type InputWorkspaceNavLink,
	type InputWorkspaceRoute,
	WorkspaceInputShell,
	useBrowserAsr,
} from '@/components/input-page';
import { VideoInputCard } from '@/features/video/components/video-input-card';
import { VideoPublicFeed } from '@/features/video/components/video-public-feed';
import { useVideoCreate } from '@/features/video/hooks/use-video-create';
import {
	type VideoInputFormValues,
	type VideoInputValidationMessages,
	createVideoInputFormSchema,
} from '@/features/video/schemas/video-input-schema';
import { useFeedback } from '@/shared/feedback';
import {
	VIDEO_DEFAULT_QUALITY_PRESET,
	VIDEO_QUALITY_PRESET_DEFAULTS,
	VIDEO_TEXT_MAX_LENGTH,
	VIDEO_TEXT_MIN_LENGTH,
	type VideoPublicCard,
} from '@/types/video';

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
	const validationMessages = useMemo<VideoInputValidationMessages>(() => ({
		durationRange: t('videoInput.validation.durationRange'),
		sectionCountRange: t('videoInput.validation.sectionCountRange'),
		sectionConcurrencyRange: t('videoInput.validation.sectionConcurrencyRange'),
		textMin: t('videoInput.validation.textMin', {
			count: VIDEO_TEXT_MIN_LENGTH,
		}),
		textMax: t('videoInput.validation.textMax', {
			count: VIDEO_TEXT_MAX_LENGTH,
		}),
		imageRequired: t('videoInput.validation.imageRequired'),
		imageType: t('videoInput.validation.imageType'),
		imageSize: t('videoInput.validation.imageSize'),
	}), [t]);
	const formSchema = useMemo(
		() => createVideoInputFormSchema(validationMessages),
		[validationMessages],
	);
	const form = useForm<VideoInputFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			inputType: 'text',
			text: '',
			imageFiles: [],
			qualityPreset: VIDEO_DEFAULT_QUALITY_PRESET,
			...VIDEO_QUALITY_PRESET_DEFAULTS[VIDEO_DEFAULT_QUALITY_PRESET],
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
	const qualityPresetLabel = t('videoInput.qualityPresetLabel');
	const qualityPresetHint = t('videoInput.qualityPresetHint');
	const advancedSettingsLabel = t('videoInput.advancedSettingsLabel');
	const recordingLabel = t('videoInput.recordingLabel');
	const presetQuick = t('videoInput.qualityPresets.fast');
	const presetBalanced = t('videoInput.qualityPresets.balanced');
	const presetCinematic = t('videoInput.qualityPresets.cinematic');
	const advancedTitle = t('videoInput.advancedDialogTitle');
	const advancedDescription = t('videoInput.advancedDialogDescription');
	const advancedReset = t('videoInput.advancedDialogReset');
	const advancedDone = t('videoInput.advancedDialogDone');
	const durationLabel = t('videoInput.advancedFields.durationMinutes');
	const sectionCountLabel = t('videoInput.advancedFields.sectionCount');
	const concurrencyLabel = t('videoInput.advancedFields.sectionConcurrency');
	const renderQualityLabel = t('videoInput.advancedFields.renderQuality');
	const layoutHintLabel = t('videoInput.advancedFields.layoutHint');
	const renderQuickLabel = t('videoInput.renderQualityOptions.l');
	const renderBalancedLabel = t('videoInput.renderQualityOptions.m');
	const renderHighLabel = t('videoInput.renderQualityOptions.h');
	const layoutCenterLabel = t('videoInput.layoutHintOptions.center_stage');
	const layoutTwoColumnLabel = t('videoInput.layoutHintOptions.two_column');
	const durationUnit = t('videoInput.summaryUnits.duration');
	const sectionUnit = t('videoInput.summaryUnits.section');
	const concurrencyShortLabel = t('videoInput.summaryUnits.concurrency');
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
						qualityPresetLabel,
						qualityPresetHint,
						advancedSettingsLabel,
						recordingLabel,
						presetQuick,
						presetBalanced,
						presetCinematic,
						advancedTitle,
						advancedDescription,
						advancedReset,
						advancedDone,
						durationLabel,
						sectionCountLabel,
						concurrencyLabel,
						renderQualityLabel,
						layoutHintLabel,
						renderQuickLabel,
						renderBalancedLabel,
						renderHighLabel,
						layoutCenterLabel,
						layoutTwoColumnLabel,
						durationUnit,
						sectionUnit,
						concurrencyShortLabel,
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
