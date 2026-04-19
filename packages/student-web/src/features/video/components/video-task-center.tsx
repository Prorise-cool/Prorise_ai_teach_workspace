/**
 * 文件说明：视频输入工作区的进行中任务中心。
 * 严格贴合设计稿，只承担 bell 触发器与下拉任务列表展示，不改页面主体骨架。
 */
import { Bell, CheckCircle2, ChevronRight, ListVideo } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TaskLifecycleStatus } from '@/types/task';

import {
	clampVideoTaskProgress,
	resolveVideoWorkspaceTaskStatusLabel,
	type VideoWorkspaceTaskItem,
} from './video-workspace-task-shared';

type VideoTaskCenterProps = {
	items: VideoWorkspaceTaskItem[];
	total: number;
	isCancellingTaskId?: string | null;
	onCancel: (taskId: string) => void;
	onDeleteTask: (taskId: string) => void;
	onEnterTask: (taskId: string) => void;
};

function resolveLifecycleLabel(
	status: TaskLifecycleStatus,
	t: (key: string, options?: Record<string, unknown>) => string,
) {
	switch (status) {
		case 'pending':
			return t('entryNav.taskCenter.statusPending');
		case 'completed':
			return t('entryNav.taskCenter.statusCompleted');
		case 'failed':
			return t('entryNav.taskCenter.statusFailed');
		case 'cancelled':
			return t('entryNav.taskCenter.statusCancelled');
		default:
			return t('entryNav.taskCenter.statusProcessing');
	}
}

export function VideoTaskCenter({
	items,
	total,
	isCancellingTaskId = null,
	onCancel,
	onDeleteTask,
	onEnterTask,
}: VideoTaskCenterProps) {
	const { t } = useAppTranslation();
	const [open, setOpen] = useState(false);
	const visibleItems = useMemo(() => items.slice(0, 5), [items]);
	const countText = t('entryNav.taskCenter.count', { count: total });
	const viewAllText = useMemo(
		() =>
			total > visibleItems.length
				? t('entryNav.taskCenter.viewAllCount', { count: total })
				: t('entryNav.taskCenter.viewAll'),
		[t, total, visibleItems.length],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={t('entryNav.taskCenter.openLabel')}
					className="relative border-border/80 bg-background/70 text-[color:var(--xm-color-text-secondary)] shadow-sm hover:bg-[color:var(--xm-color-surface)]"
				>
					<Bell className="h-4 w-4" />
					{total > 0 ? (
						<span
							data-testid="video-task-center-indicator"
							className="absolute right-0 top-0 flex h-3 w-3 -translate-y-1/4 translate-x-1/4"
						>
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70" />
							<span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-destructive" />
						</span>
					) : null}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				sideOffset={12}
				className="w-[320px] overflow-hidden rounded-[28px] border border-border/70 bg-background p-0 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.2)] backdrop-blur-[var(--xm-blur-surface)] sm:w-[380px]"
			>
				<div className="flex items-center justify-between border-b border-border/60 bg-secondary/35 px-5 py-3.5">
					<div className="flex items-center gap-2 text-foreground">
						<ListVideo className="h-4 w-4 text-[color:var(--xm-color-primary-strong)]" />
						<span className="text-[14px] font-black tracking-tight">
							{t('entryNav.taskCenter.title')}
						</span>
					</div>
					<span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] font-bold text-muted-foreground shadow-sm">
						{countText}
					</span>
				</div>

				<div className="flex max-h-[50vh] flex-col overflow-y-auto p-2">
					{visibleItems.length === 0 ? (
						<div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-[12px] font-medium text-muted-foreground">
							<CheckCircle2 className="h-8 w-8 opacity-20" />
							<span>{t('entryNav.taskCenter.empty')}</span>
						</div>
					) : (
						visibleItems.map((item) => {
							const progress = clampVideoTaskProgress(item.progress);
							const statusLabel =
								item.lifecycleStatus === 'processing'
									? resolveVideoWorkspaceTaskStatusLabel(
											item.lifecycleStatus,
											item.currentStage,
											item.stageLabel,
											t,
									  )
									: resolveLifecycleLabel(item.lifecycleStatus, t);

							return (
								<div
									key={item.taskId}
									className="mx-1 my-1 rounded-2xl border border-border/50 bg-secondary/20 p-3 shadow-sm transition-colors hover:bg-secondary/60 dark:bg-[rgba(255,255,255,0.04)] dark:hover:bg-[rgba(255,255,255,0.07)]"
								>
									<div className="mb-2 flex items-start justify-between gap-2">
										<h4 className="line-clamp-1 flex-1 text-[13px] font-bold leading-tight text-foreground">
											{item.title || t('entryNav.taskCenter.fallbackTitle')}
										</h4>
										<span
											className={cn(
												'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
												item.lifecycleStatus === 'pending'
													? 'border-border/70 bg-secondary text-muted-foreground'
													: 'border-[color:var(--xm-color-primary)]/20 bg-[color:var(--xm-color-primary)]/15 text-[color:var(--xm-color-primary-strong)]',
											)}
										>
											{statusLabel}
										</span>
									</div>

									<p className="mb-2.5 truncate text-[11px] font-medium text-muted-foreground">
										{item.message || t('entryNav.taskCenter.fallbackMessage')}
									</p>

									<div className="mb-3 space-y-1.5">
										<div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground">
											<span>{progress}%</span>
										</div>
										<div className="h-1.5 overflow-hidden rounded-full bg-[rgba(59,23,1,0.08)] dark:bg-[rgba(255,255,255,0.08)]">
											<div
												className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,197,71,0.88),rgba(255,140,0,0.92))] shadow-[0_0_18px_rgba(245,197,71,0.28)] transition-[width] duration-300"
												style={{ width: `${progress}%` }}
											/>
										</div>
									</div>

									<div className="flex justify-end gap-2 border-t border-border/40 pt-2">
																				{item.lifecycleStatus !== 'completed' && (
											<button
											type="button"
											className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
											aria-label={t('entryNav.taskCenter.cancelTaskAria', {
												title: item.title,
											})}
											disabled={isCancellingTaskId === item.taskId}
											onClick={() => onCancel(item.taskId)}
											>
											{t('entryNav.taskCenter.cancel')}
											</button>
										)}
										{item.lifecycleStatus === 'completed' && (
											<button
											type="button"
											className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
											aria-label={t('entryNav.taskCenter.deleteTaskAria', {
												title: item.title,
											})}
											onClick={() => onDeleteTask(item.taskId)}
											>
											{t('entryNav.taskCenter.delete')}
											</button>
										)}
										<button
											type="button"
											className="rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm transition-colors hover:border-[color:var(--xm-color-primary)]"
											aria-label={t('entryNav.taskCenter.enterTaskAria', {
												title: item.title,
											})}
											onClick={() => {
												setOpen(false);
												onEnterTask(item.taskId);
											}}
										>
											{item.lifecycleStatus === 'completed' ? t('entryNav.taskCenter.viewResult') : t('entryNav.taskCenter.enter')}
										</button>
									</div>
								</div>
							);
						})
					)}
				</div>

				{total > visibleItems.length ? (
					<div className="flex justify-center border-t border-border/60 bg-secondary/20 px-5 py-3 dark:bg-[rgba(255,255,255,0.03)]">
						<div className="flex w-full items-center justify-center gap-1.5 text-[12px] font-bold text-muted-foreground">
							<span>{viewAllText}</span>
							<ChevronRight className="h-3.5 w-3.5" />
						</div>
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
