/**
 * 文件说明：课堂工作区输入页容器。
 * 对照设计稿 06-课堂输入页/01-input.html 还原沉浸式输入区：
 * 标题区 + 核心输入卡片（智能匹配提示 + Textarea + 工具栏 + 提交按钮）+ 建议标签 + 引导卡片。
 * 社区瀑布流由 CommunityFeed 组件独立承接。
 */
import { useState } from 'react';

import {
	ArrowRight,
	FileText,
	Globe,
	LayoutTemplate,
	Mic,
	PackageSearch,
	Paperclip,
	ShieldAlert,
	Sparkles,
	WifiOff,
	X
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CommunityFeed, CLASSROOM_FEED_MOCK_CARDS } from '@/components/community-feed';
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
import '@/features/classroom/styles/classroom-input-page.scss';

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
	}) as EntryNavLink[];
	const wsRoutes = t('entryNav.workspaceRoutes', {
		returnObjects: true
	}) as WorkspaceRoute[];

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
			className="xm-classroom-input"
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

			<div className="xm-classroom-input__content">
				{/* 标题区 */}
				<motion.div variants={itemVariants} className="w-full flex justify-center">
					<InputPageHeader
						badgeIcon={LayoutTemplate}
						badgeLabel={badgeLabel}
						titleLine1={titleLine1}
						titleGradient={titleGradient}
					/>
				</motion.div>

				{/* 核心输入卡片 */}
				<motion.div variants={itemVariants} className="xm-classroom-input__card" style={{ margin: '0 auto' }}>
					{/* 智能匹配提示栏 */}
					<div className="xm-classroom-input__card-hints">
						<div className="xm-classroom-input__card-hint xm-classroom-input__card-hint--accent">
							<Sparkles className="h-3.5 w-3.5" />
							<span>{smartMatchHint}</span>
							<span className="xm-classroom-input__card-hint-desc">
								{smartMatchDesc}
							</span>
						</div>
						<div className="xm-classroom-input__card-hint">
							<span>{multiAgentHint}</span>
						</div>
					</div>

					{/* 输入区 */}
					<div 
						className="xm-classroom-input__card-body relative"
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						{isDragging && (
							<div className="absolute inset-0 z-10 m-3 flex flex-col items-center justify-center rounded-[var(--xm-radius-md)] bg-[color:var(--xm-color-surface-glass)] backdrop-blur-sm border-2 border-dashed border-primary">
								<p className="text-sm font-semibold text-primary">松开鼠标，上传参考课件</p>
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
							className="xm-classroom-input__card-textarea"
							placeholder={placeholder}
							rows={4}
							value={text}
							onChange={(e) => setText(e.target.value)}
						/>
					</div>

					{/* 工具栏 */}
					<div className="xm-classroom-input__card-toolbar">
						<div className="xm-classroom-input__card-tools">
							<input
								type="file"
								className="hidden"
								ref={fileInputRef}
								onChange={handleFileChange}
							/>
							<button
								type="button"
								className="xm-classroom-input__card-tool-btn"
								title={toolUploadFile}
								onClick={triggerSelect}
							>
								<Paperclip className="h-4 w-4" />
							</button>
							<button
								type="button"
								className={cn(
									'xm-classroom-input__card-tool-btn relative',
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

							<div className="xm-classroom-input__card-divider" />



							<button
								type="button"
								className={cn(
									'xm-classroom-input__card-toggle',
									webSearchEnabled && 'xm-classroom-input__card-toggle--active'
								)}
								onClick={() => setWebSearchEnabled((prev) => !prev)}
							>
								<Globe className="h-3.5 w-3.5" />
								{toolWebSearch}
							</button>
						</div>

						<button
							type="button"
							className="xm-classroom-input__card-submit"
							onClick={() => {

								console.log('[ClassroomInput] 生成课堂 - 待接入');
							}}
						>
							<span>{submitLabel}</span>
							<ArrowRight className="h-4 w-4" />
						</button>
					</div>
				</motion.div>

				{/* 建议标签 */}
				<motion.div variants={itemVariants} className="w-full flex justify-center">
					<InputPageSuggestions
						label={suggestionsLabel}
						pills={suggestions}
						onSelect={(pill) => {

							console.log(`[ClassroomInput] 建议: ${pill}`);
						}}
					/>
				</motion.div>
			</div>

			{/* 引导卡片 */}
			<motion.div variants={itemVariants} className="w-full flex justify-center">
				<InputPageGuideCards cards={guideCards} />
			</motion.div>

			{/* 社区瀑布流 */}
			<motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto">
				<CommunityFeed
					title={feedTitle}
					description={feedDesc}
					categories={feedCategories}
					cards={CLASSROOM_FEED_MOCK_CARDS}
					loadMoreLabel={feedLoadMore}
					loadingLabel={feedLoading}
				/>
			</motion.div>
		</motion.main>
	);
}
