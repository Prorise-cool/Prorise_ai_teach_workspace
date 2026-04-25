/**
 * 文件说明：课堂工作区输入页容器。
 * 页面容器负责课堂输入业务状态，公共页面壳层和卡片骨架下沉到共享组件。
 *
 * 提交入口：接入多智能体课堂管道
 * （POST /api/v1/classroom/classroom → Dramatiq worker → ready 后跳 playback）。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LayoutTemplate, SlidersHorizontal } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
	type InputWorkspaceNavLink,
	type InputWorkspaceRoute,
	useFileDropzone,
	useBrowserAsr,
	WorkspaceInputShell
} from '@/components/input-page';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useWorkspaceTaskBell } from '@/components/workspace-task-bell';
import { ClassroomPublicFeed } from '@/features/classroom/components/classroom-public-feed';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';
import { ClassroomInputCard } from '@/features/classroom/components/classroom-input-card';
import { ClassroomInputAdvancedDialog } from '@/features/classroom/components/classroom-input-advanced-dialog';
import { useClassroomCreate } from '@/features/classroom/hooks/use-classroom';

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
	const [text, setText] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [sceneCount, setSceneCount] = useState<number>(10);
	const [interactiveMode, setInteractiveMode] = useState<boolean>(false);
	const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
	const { create } = useClassroomCreate();
	const { slot: workspaceUtilitySlot } = useWorkspaceTaskBell({
		mutationScope: 'classroom-input',
	});

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

	const advancedTriggerLabel = t('classroomInput.advanced.triggerLabel');
	const advancedDialogTitle = t('classroomInput.advanced.dialogTitle');
	const advancedDialogDescription = t('classroomInput.advanced.dialogDescription');
	const advancedDoneLabel = t('classroomInput.advanced.doneLabel');
	const advancedSceneCountLabel = t('classroomInput.advanced.sceneCountLabel');
	const advancedSceneCountHint = t('classroomInput.advanced.sceneCountHint');
	const advancedInteractiveLabel = t('classroomInput.advanced.interactiveLabel');
	const advancedInteractiveHint = t('classroomInput.advanced.interactiveHint');
	const advancedInteractiveOn = t('classroomInput.advanced.interactiveOn');
	const advancedInteractiveOff = t('classroomInput.advanced.interactiveOff');
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
			workspaceUtilitySlot={workspaceUtilitySlot}
			content={{
				className: 'xm-classroom-input__content'
			}}
			badgeIcon={LayoutTemplate}
			badgeLabel={badgeLabel}
			titleLine1={titleLine1}
			titleGradient={titleGradient}
			card={
				<Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
				<ClassroomInputCard
					text={text}
					onTextChange={event => {
						setText(event.target.value);
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
							const taskId = await create({
								requirement,
								pdfText,
								sceneCount,
								interactiveMode,
							});
							void navigate(`/classroom/generating/${taskId}`);
						} catch (err) {
							console.error('[ClassroomInput] 课堂生成失败:', err);
							setIsSubmitting(false);
						}
					}}
					labels={{
						smartMatchHint,
						smartMatchDesc,
						multiAgentHint,
						placeholder,
						submitLabel: isSubmitting
							? t('openmaic.generation.submitting')
							: submitLabel,
						toolUploadFile,
						toolVoiceInput,
					}}
					advancedTrigger={
						<DialogTrigger asChild>
							<button
								type="button"
								className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
								aria-label={advancedTriggerLabel}
							>
								<SlidersHorizontal className="h-3.5 w-3.5" />
								{advancedTriggerLabel}
							</button>
						</DialogTrigger>
					}
				/>
				<ClassroomInputAdvancedDialog
					sceneCount={sceneCount}
					interactiveMode={interactiveMode}
					onSceneCountChange={setSceneCount}
					onInteractiveChange={setInteractiveMode}
					onClose={() => setIsAdvancedOpen(false)}
					labels={{
						advancedTitle: advancedDialogTitle,
						advancedDescription: advancedDialogDescription,
						advancedDone: advancedDoneLabel,
						sceneCountLabel: advancedSceneCountLabel,
						sceneCountHint: advancedSceneCountHint,
						interactiveLabel: advancedInteractiveLabel,
						interactiveHint: advancedInteractiveHint,
						interactiveOn: advancedInteractiveOn,
						interactiveOff: advancedInteractiveOff,
					}}
				/>
				</Dialog>
			}
			suggestionsLabel={suggestionsLabel}
			suggestions={suggestions}
			onSuggestionSelect={pill => {
				setText(pill);
			}}
			feedTitle={feedTitle}
			feedDescription={feedDesc}
			feedCards={[]}
			feedLoadMoreLabel={feedLoadMore}
			feedLoadingLabel={feedLoading}
			feedSlot={
				<ClassroomPublicFeed
					labels={{
						title: feedTitle,
						description: feedDesc,
						emptyTitle: t('classroomInput.feedEmptyTitle'),
						emptyDescription: t('classroomInput.feedEmptyDesc'),
						errorTitle: t('classroomInput.feedErrorTitle'),
						errorDescription: t('classroomInput.feedErrorDesc'),
						viewActionLabel: t('classroomInput.feedViewAction'),
						publicBadgeLabel: t('classroomInput.feedPublicBadge'),
					}}
				/>
			}
		/>
	);
}
