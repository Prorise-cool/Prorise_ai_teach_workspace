/**
 * 文件说明：视频工作区“当前任务”卡片。
 * 供视频输入页与首页复用，保持任务状态展示与操作一致。
 */
import { Clock3 } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

import {
	clampVideoTaskProgress,
	resolveVideoWorkspaceTaskStatusLabel,
	type VideoWorkspaceTaskItem,
} from './video-workspace-task-shared';

type VideoActiveTaskCardProps = {
	task: VideoWorkspaceTaskItem;
	queueCount: number;
	headerTitle: string;
	headerSubtitle: string;
	note: string;
	onCancel: (taskId: string) => void;
	onContinue: (taskId: string) => void;
	className?: string;
	isFocused?: boolean;
	focusNotice?: string | null;
	isCancelling?: boolean;
};

export function VideoActiveTaskCard({
	task,
	queueCount,
	headerTitle,
	headerSubtitle,
	note,
	onCancel,
	onContinue,
	className,
	isFocused = false,
	focusNotice = null,
	isCancelling = false,
}: VideoActiveTaskCardProps) {
	const { t } = useAppTranslation();
	const progress = clampVideoTaskProgress(task.progress);
	const statusLabel = resolveVideoWorkspaceTaskStatusLabel(
		task.lifecycleStatus,
		task.currentStage,
		task.stageLabel,
		t,
	);

	return (
		<div
			className={cn(
				'w-full overflow-hidden rounded-[28px] border border-border/70 bg-background/90 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.16)] backdrop-blur-[var(--xm-blur-surface)]',
				isFocused && 'ring-2 ring-[color:var(--xm-color-primary)]/25',
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3 border-b border-border/60 bg-secondary/35 px-5 py-3.5">
				<div className="flex items-center gap-2.5 text-foreground">
					<div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--xm-color-primary)]/20 bg-[color:var(--xm-color-primary)]/12">
						<Clock3 className="h-4 w-4 text-[color:var(--xm-color-primary-strong)]" />
					</div>
					<div className="space-y-0.5">
						<p className="text-[14px] font-black tracking-tight">{headerTitle}</p>
						<p className="text-[11px] font-medium text-muted-foreground">
							{headerSubtitle}
						</p>
					</div>
				</div>
				<span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-sm">
					{t('videoInput.activeTask.queueCount', {
						count: queueCount,
					})}
				</span>
			</div>

			<div className="space-y-4 px-5 py-4">
				{focusNotice ? (
					<div className="rounded-2xl border border-[color:var(--xm-color-primary)]/20 bg-[color:var(--xm-color-primary)]/12 px-3.5 py-2.5 text-[12px] font-medium text-[color:var(--xm-color-text-primary)]">
						{focusNotice}
					</div>
				) : null}

				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1 space-y-1">
						<h3 className="line-clamp-2 text-[16px] font-black tracking-tight text-foreground">
							{task.title}
						</h3>
						<p className="line-clamp-2 text-[12px] font-medium leading-5 text-muted-foreground">
							{task.message || t('entryNav.taskCenter.fallbackMessage')}
						</p>
					</div>
					<span
						className={cn(
							'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold',
							task.lifecycleStatus === 'pending'
								? 'border-border/70 bg-secondary text-muted-foreground'
								: 'border-[color:var(--xm-color-primary)]/20 bg-[color:var(--xm-color-primary)]/15 text-[color:var(--xm-color-primary-strong)]',
						)}
					>
						{statusLabel}
					</span>
				</div>

				<div className="space-y-2.5">
					<div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
						<span>{t('videoInput.activeTask.progressLabel')}</span>
						<span>{progress}%</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-[rgba(59,23,1,0.08)] dark:bg-[rgba(255,255,255,0.08)]">
						<div
							className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,197,71,0.88),rgba(255,140,0,0.92))] shadow-[0_0_18px_rgba(245,197,71,0.28)] transition-[width] duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<div className="flex items-center justify-between gap-3 text-[12px] font-medium text-muted-foreground">
						<span className="line-clamp-1">
							{t('videoInput.activeTask.stageLabel', {
								stage: statusLabel,
							})}
						</span>
						{queueCount > 1 ? (
							<span className="shrink-0">
								{t('videoInput.activeTask.moreTasksHint', {
									count: queueCount - 1,
								})}
							</span>
						) : null}
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/20 px-3.5 py-3 dark:bg-[rgba(255,255,255,0.04)]">
					<p className="min-w-0 flex-1 text-[12px] font-medium leading-5 text-muted-foreground">
						{note}
					</p>
					<div className="flex shrink-0 flex-wrap gap-2">
						<button
							type="button"
							className="rounded-xl px-3.5 py-2 text-[12px] font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
							aria-label={t('entryNav.taskCenter.cancelTaskAria', {
								title: task.title,
							})}
							disabled={isCancelling}
							onClick={() => onCancel(task.taskId)}
						>
							{t('video.common.cancelTask')}
						</button>
						<button
							type="button"
							className="rounded-xl border border-border bg-background px-3.5 py-2 text-[12px] font-bold text-foreground shadow-sm transition-colors hover:border-[color:var(--xm-color-primary)]"
							aria-label={t('videoInput.activeTask.continueTaskAria', {
								title: task.title,
							})}
							onClick={() => onContinue(task.taskId)}
						>
							{t('videoInput.activeTask.continueAction')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
