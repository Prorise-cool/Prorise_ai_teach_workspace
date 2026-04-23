/**
 * 文件说明：课堂工作区输入页容器。
 * 页面容器负责课堂输入业务状态，公共页面壳层和卡片骨架下沉到共享组件。
 *
 * 提交入口：接入多智能体课堂管道
 * （POST /api/v1/classroom/classroom → Dramatiq worker → ready 后跳 playback）。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
	LayoutTemplate,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
	type InputWorkspaceNavLink,
	type InputWorkspaceRoute,
	useFileDropzone,
	useBrowserAsr,
	WorkspaceInputShell
} from '@/components/input-page';
import { CLASSROOM_FEED_MOCK_CARDS } from '@/components/community-feed';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';
import { ClassroomInputCard } from '@/features/classroom/components/classroom-input-card';
import { useClassroomCreate } from '@/features/classroom/hooks/use-classroom';
import { useClassroomStore } from '@/features/classroom/stores/classroom-store';

import '@/components/input-page/styles/input-page-shared.scss';
import '@/features/classroom/styles/classroom-input-page.scss';

/**
 * 渲染课堂工作区输入页。
 *
 * @returns 课堂输入页节点。
 */
export function ClassroomInputPage() {
	const { t } = useAppTranslation();
	const navigate = useNavigate();
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const [text, setText] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { create } = useClassroomCreate();
	const generationProgress = useClassroomStore((s) => s.generationProgress);
	const generationMessage = useClassroomStore((s) => s.generationMessage);

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
	const feedLoadMore = t('classroomInput.feedLoadMore');
	const feedLoading = t('classroomInput.feedLoading');

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
					onSubmit={async () => {
						if (isSubmitting) return;
						const requirement = text.trim();
						if (requirement.length < 5) {
							console.warn('[ClassroomInput] 主题过短，已拦截');
							return;
						}
						setIsSubmitting(true);
						try {
							let pdfText: string | undefined;
							if (attachedFile && /\.pdf$/i.test(attachedFile.name)) {
								const form = new FormData();
								form.append('file', attachedFile);
								const parsed = await resolveClassroomAdapter()
									.parsePdf(form)
									.catch(() => null);
								pdfText = parsed?.text;
							}
							const classroomId = await create({
								requirement,
								pdfText,
								enableWebSearch: webSearchEnabled,
							});
							void navigate(`/classroom/play/${classroomId}`);
						} catch (err) {
							console.error('[ClassroomInput] 课堂生成失败:', err);
						} finally {
							setIsSubmitting(false);
						}
					}}
					labels={{
						smartMatchHint,
						smartMatchDesc,
						multiAgentHint,
						placeholder,
						submitLabel: isSubmitting
							? generationProgress > 0
								? `${generationMessage ?? t('classroom.inputPage.generatingPrefix')} ${Math.round(generationProgress)}%`
								: t('openmaic.generation.generating')
							: submitLabel,
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
			feedTitle={feedTitle}
			feedDescription={feedDesc}
			feedCards={CLASSROOM_FEED_MOCK_CARDS}
			feedLoadMoreLabel={feedLoadMore}
			feedLoadingLabel={feedLoading}
		/>
	);
}
