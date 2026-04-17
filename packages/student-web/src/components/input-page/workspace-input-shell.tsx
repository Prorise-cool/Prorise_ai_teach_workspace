/**
 * 文件说明：输入工作区共享页面壳层。
 * 负责承接课堂页与视频页共同的主布局、导航、高光背景、动画节奏和通用区块拼装。
 */
import {
	type LucideIcon,
} from 'lucide-react';
import type { Variants } from 'motion/react';
import { motion } from 'motion/react';
import type { FormEventHandler, ReactNode } from 'react';

import { CommunityFeed } from '@/components/community-feed';
import type { CommunityWorkCard } from '@/components/community-feed/community-feed-types';
import { GlobalTopNav } from '@/components/navigation/global-top-nav';

import {
	InputPageGuideCards,
	type GuideCardItem,
} from './input-page-guide-cards';
import { InputPageHeader } from './input-page-header';
import { InputPageSuggestions } from './input-page-suggestions';

export type InputWorkspaceNavLink = {
	href: string;
	label: string;
};

export type InputWorkspaceRoute = {
	href: string;
	label: string;
	icon: string;
};

type WorkspaceInputContentProps = {
	/** 内容区使用的宿主节点类型。 */
	as?: 'div' | 'form';
	/** 内容区 className。 */
	className: string;
	/** `form` 模式下的提交处理器。 */
	onSubmit?: FormEventHandler<HTMLFormElement>;
	/** `form` 模式下是否禁用原生校验。 */
	noValidate?: boolean;
};

type WorkspaceInputShellProps = {
	/** 页面根 block class。 */
	rootClassName: string;
	/** 顶栏导航链接。 */
	navLinks: InputWorkspaceNavLink[];
	/** 工作区路由列表。 */
	workspaceRoutes: InputWorkspaceRoute[];
	/** 内容区宿主参数。 */
	content: WorkspaceInputContentProps;
	/** 标题 badge 图标。 */
	badgeIcon: LucideIcon;
	/** 标题 badge 文案。 */
	badgeLabel: string;
	/** 标题第一行。 */
	titleLine1: string;
	/** 标题渐变文案。 */
	titleGradient: string;
	/** 标题附加 className。 */
	headerClassName?: string;
	/** 核心输入卡片。 */
	card: ReactNode;
	/** 建议标签标题。 */
	suggestionsLabel: string;
	/** 建议标签列表。 */
	suggestions: string[];
	/** 点击建议标签时的回调。 */
	onSuggestionSelect?: (pill: string) => void;
	/** 引导卡片列表。 */
	guideCards: GuideCardItem[];
	/** 社区瀑布流标题。 */
	feedTitle: string;
	/** 社区瀑布流描述。 */
	feedDescription: string;
	/** 社区分类。 */
	feedCategories: string[];
	/** 社区卡片列表。 */
	feedCards: CommunityWorkCard[];
	/** 顶栏右侧功能插槽。 */
	workspaceUtilitySlot?: ReactNode;
	/** 加载更多文案。 */
	feedLoadMoreLabel?: string;
	/** 加载中文案。 */
	feedLoadingLabel?: string;
	/** 自定义 feed 槽位，优先级高于默认 CommunityFeed。 */
	feedSlot?: ReactNode;
};

const containerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.08, delayChildren: 0.05 },
	},
};

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
 * 渲染课堂页与视频页共享的输入工作区页面壳层。
 *
 * @param props - 壳层参数。
 * @returns 输入工作区页面节点。
 */
export function WorkspaceInputShell({
	rootClassName,
	navLinks,
	workspaceRoutes,
	content,
	badgeIcon,
	badgeLabel,
	titleLine1,
	titleGradient,
	headerClassName,
	card,
	suggestionsLabel,
	suggestions,
	onSuggestionSelect,
	guideCards,
	feedTitle,
	feedDescription,
	feedCategories,
	feedCards,
	workspaceUtilitySlot,
	feedLoadMoreLabel,
	feedLoadingLabel,
	feedSlot,
}: WorkspaceInputShellProps) {
	const contentSections = (
		<>
			<motion.div variants={itemVariants} className="w-full flex justify-center">
				<InputPageHeader
					className={headerClassName}
					badgeIcon={badgeIcon}
					badgeLabel={badgeLabel}
					titleLine1={titleLine1}
					titleGradient={titleGradient}
				/>
			</motion.div>

			<motion.div variants={itemVariants} className="w-full flex justify-center">
				{card}
			</motion.div>

			<motion.div variants={itemVariants} className="w-full flex justify-center">
				<InputPageSuggestions
					label={suggestionsLabel}
					pills={suggestions}
					onSelect={onSuggestionSelect}
				/>
			</motion.div>
		</>
	);

	return (
		<motion.main
			className={rootClassName}
			initial="hidden"
			animate="visible"
			variants={containerVariants}
		>
			<div
				className="absolute top-0 left-0 h-[600px] w-full pointer-events-none -z-10"
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
				workspaceRoutes={workspaceRoutes}
				workspaceUtilitySlot={workspaceUtilitySlot}
				showAuthAction
				showBrandIcon
				showLocaleToggle
				className="xm-landing-glass-nav"
			/>

			{content.as === 'form' ? (
				<form
					className={content.className}
					onSubmit={content.onSubmit}
					noValidate={content.noValidate}
				>
					{contentSections}
				</form>
			) : (
				<div className={content.className}>{contentSections}</div>
			)}

			<motion.div variants={itemVariants} className="w-full flex justify-center">
				<InputPageGuideCards cards={guideCards} />
			</motion.div>

			<motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto">
				{feedSlot ?? (
					<CommunityFeed
						title={feedTitle}
						description={feedDescription}
						categories={feedCategories}
						cards={feedCards}
						loadMoreLabel={feedLoadMoreLabel}
						loadingLabel={feedLoadingLabel}
					/>
				)}
			</motion.div>
		</motion.main>
	);
}
