/**
 * 文件说明：课堂工作区输入页容器。
 * 页面容器负责课堂输入业务状态，公共页面壳层和卡片骨架下沉到共享组件。
 */
import { useState } from 'react';

import {
	LayoutTemplate,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
	INPUT_PAGE_GUIDE_CARD_ICONS,
	type InputWorkspaceNavLink,
	type InputWorkspaceRoute,
	useFileDropzone,
	useBrowserAsr,
	type GuideCardItem,
	WorkspaceInputShell
} from '@/components/input-page';
import { CLASSROOM_FEED_MOCK_CARDS } from '@/components/community-feed';
import { ClassroomInputCard } from '@/features/classroom/components/classroom-input-card';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/classroom/styles/classroom-input-page.scss';

/**
 * 渲染课堂工作区输入页。
 *
 * @returns 课堂输入页节点。
 */
export function ClassroomInputPage() {
	const { t } = useAppTranslation();
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
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
		// When using voice input, we replace the text.
		if (transcript) setText(transcript);
	});

	const navLinks = t('entryNav.landingLinks', {
		returnObjects: true
	}) as InputWorkspaceNavLink[];
	const wsRoutes = t('entryNav.workspaceRoutes', {
		returnObjects: true
	}) as InputWorkspaceRoute[];

	const badgeLabel = t('classroomInput.badgeLabel');
	const titleLine1 = t('classroomInput.titleLine1');
	const titleGradient = t('classroomInput.titleGradient');
	const placeholder = t('classroomInput.placeholder');
	const submitLabel = t('classroomInput.submitLabel');
	const smartMatchHint = t('classroomInput.smartMatchHint');
	const smartMatchDesc = t('classroomInput.smartMatchDesc');
	const multiAgentHint = t('classroomInput.multiAgentHint');
	const toolUploadFile = t('classroomInput.toolUploadFile');
	const toolVoiceInput = t('classroomInput.toolVoiceInput');

	const toolWebSearch = t('classroomInput.toolWebSearch');
	const suggestionsLabel = t('classroomInput.suggestionsLabel');
	const suggestions = t('classroomInput.suggestions', {
		returnObjects: true
	}) as string[];

	const feedTitle = t('classroomInput.feedTitle');
	const feedDesc = t('classroomInput.feedDesc');
	const feedCategories = t('classroomInput.feedCategories', {
		returnObjects: true
	}) as string[];
	const feedLoadMore = t('classroomInput.feedLoadMore');
	const feedLoading = t('classroomInput.feedLoading');

	const guideCardsData = t('classroomInput.guideCards', {
		returnObjects: true
	}) as Array<{ title: string; desc: string }>;

	const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
		icon: INPUT_PAGE_GUIDE_CARD_ICONS[i],
		title: card.title,
		desc: card.desc
	}));

	return (
		<WorkspaceInputShell
			rootClassName="xm-classroom-input"
			navLinks={navLinks}
			workspaceRoutes={wsRoutes}
			content={{
				className: 'xm-classroom-input__content'
			}}
			badgeIcon={LayoutTemplate}
			badgeLabel={badgeLabel}
			titleLine1={titleLine1}
			titleGradient={titleGradient}
			card={
				<ClassroomInputCard
					text={text}
					onTextChange={event => {
						setText(event.target.value);
					}}
					webSearchEnabled={webSearchEnabled}
					onToggleWebSearch={() => {
						setWebSearchEnabled(prev => !prev);
					}}
					isRecording={isRecording}
					onToggleRecording={toggleRecording}
					isDragging={isDragging}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					attachedFile={attachedFile}
					onClearFile={clearFile}
					onTriggerSelect={triggerSelect}
					fileInputRef={fileInputRef}
					onFileChange={handleFileChange}
					onSubmit={() => {
						console.log('[ClassroomInput] 生成课堂 - 待接入');
					}}
					labels={{
						smartMatchHint,
						smartMatchDesc,
						multiAgentHint,
						placeholder,
						submitLabel,
						toolUploadFile,
						toolVoiceInput,
						toolWebSearch
					}}
				/>
			}
			suggestionsLabel={suggestionsLabel}
			suggestions={suggestions}
			onSuggestionSelect={pill => {
				console.log(`[ClassroomInput] 建议: ${pill}`);
			}}
			guideCards={guideCards}
			feedTitle={feedTitle}
			feedDescription={feedDesc}
			feedCategories={feedCategories}
			feedCards={CLASSROOM_FEED_MOCK_CARDS}
			feedLoadMoreLabel={feedLoadMore}
			feedLoadingLabel={feedLoading}
		/>
	);
}
