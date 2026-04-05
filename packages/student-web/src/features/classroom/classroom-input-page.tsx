/**
 * 文件说明：课堂工作区输入页容器。
 * 对照设计稿 06-课堂输入页/01-input.html 还原沉浸式输入区：
 * 标题区 + 核心输入卡片（智能匹配提示 + Textarea + 工具栏 + 提交按钮）+ 建议标签 + 引导卡片。
 * 社区瀑布流由 CommunityFeed 组件独立承接。
 */
import { useState } from 'react';

import {
	ArrowRight,
	Globe,
	LayoutTemplate,
	Mic,
	PackageSearch,
	Paperclip,
	Settings2,
	ShieldAlert,
	Sparkles,
	WifiOff
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CommunityFeed, CLASSROOM_FEED_MOCK_CARDS } from '@/components/community-feed';
import {
	InputPageGuideCards,
	InputPageHeader,
	InputPageSuggestions,
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

	const navLinks = t('entryNav.landingLinks', {
		returnObjects: true
	}) as EntryNavLink[];

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
	const toolEnhanceSettings = t('classroomInput.toolEnhanceSettings');
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

	const guideCardsData = t('classroomInput.guideCards', {
		returnObjects: true
	}) as Array<{ title: string; desc: string }>;

	const guideCards: GuideCardItem[] = guideCardsData.map((card, i) => ({
		icon: GUIDE_CARD_ICONS[i],
		title: card.title,
		desc: card.desc
	}));

	return (
		<main className="xm-classroom-input">
			<GlobalTopNav
				links={navLinks}
				showAuthAction
				showBrandIcon
				showLocaleToggle
				className="xm-landing-glass-nav"
			/>

			<div className="xm-classroom-input__content">
				{/* 标题区 */}
				<InputPageHeader
					badgeIcon={LayoutTemplate}
					badgeLabel={badgeLabel}
					titleLine1={titleLine1}
					titleGradient={titleGradient}
				/>

				{/* 核心输入卡片 */}
				<div className="xm-classroom-input__card">
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
					<div className="xm-classroom-input__card-body">
						<textarea
							className="xm-classroom-input__card-textarea"
							placeholder={placeholder}
							rows={4}
						/>
					</div>

					{/* 工具栏 */}
					<div className="xm-classroom-input__card-toolbar">
						<div className="xm-classroom-input__card-tools">
							<button
								type="button"
								className="xm-classroom-input__card-tool-btn"
								title={toolUploadFile}
								onClick={() => {

									console.log('[ClassroomInput] 上传课件 - 待接入');
								}}
							>
								<Paperclip className="h-4 w-4" />
							</button>
							<button
								type="button"
								className="xm-classroom-input__card-tool-btn"
								title={toolVoiceInput}
								onClick={() => {

									console.log('[ClassroomInput] 语音输入 - 待接入');
								}}
							>
								<Mic className="h-4 w-4" />
							</button>

							<div className="xm-classroom-input__card-divider" />

							<button
								type="button"
								className="xm-classroom-input__card-tool-text-btn"
								onClick={() => {

									console.log('[ClassroomInput] 增强设置 - 待接入');
								}}
							>
								<Settings2 className="h-3.5 w-3.5" />
								{toolEnhanceSettings}
							</button>

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
				</div>

				{/* 建议标签 */}
				<InputPageSuggestions
					label={suggestionsLabel}
					pills={suggestions}
					onSelect={(pill) => {

						console.log(`[ClassroomInput] 建议: ${pill}`);
					}}
				/>
			</div>

			{/* 引导卡片 */}
			<InputPageGuideCards cards={guideCards} />

			{/* 社区瀑布流 */}
			<CommunityFeed
				title={feedTitle}
				description={feedDesc}
				categories={feedCategories}
				cards={CLASSROOM_FEED_MOCK_CARDS}
			/>
		</main>
	);
}
