/**
 * 文件说明：错题本页（Epic 9 P0 收口）。
 *
 * 数据链路：quiz 提交 → FastAPI `submit_quiz` 写入 xm_learning_wrongbook
 * → 本页通过 `/xiaomai/learning-center/history?resultType=wrongbook` 回读。
 * 点击卡片展开错题解析（来源 wrongbook.analysis_summary）。
 */
import { BookX, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { resolveWrongbookAdapter } from '@/services/api/adapters/wrongbook-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

export function WrongbookPage() {
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const session = useAuthSessionStore((state) => state.session);
	const adapter = useMemo(() => resolveWrongbookAdapter(), []);

	const userId = session?.user.id;
	const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
	const [records, setRecords] = useState<LearningCenterRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const pageSize = 20;
	const viewStatus: ViewStatus = userId ? loadStatus : 'permission-denied';

	useEffect(() => {
		if (!userId) return;
		let cancelled = false;

		void (async () => {
			setLoadStatus('loading');
			try {
				const page = await adapter.listWrongbook({ userId, pageNum: 1, pageSize });
				if (cancelled) return;
				setRecords(page.rows ?? []);
				setTotal(page.total ?? 0);
				setLoadStatus('ready');
			} catch (error: unknown) {
				if (cancelled) return;
				setLoadStatus('error');
				notify({
					tone: 'error',
					title: t('learningCenter.feedback.loadFailedTitle'),
					description:
						error instanceof Error
							? error.message
							: t('learningCenter.feedback.loadFailedMessage'),
				});
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [adapter, notify, userId, t]);

	const toggle = (recordId: string) => {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(recordId)) {
				next.delete(recordId);
			} else {
				next.add(recordId);
			}
			return next;
		});
	};

	if (viewStatus === 'permission-denied') {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center text-text-primary dark:text-text-primary-dark">
				<p className="text-sm font-bold">{t('learningCenter.feedback.permissionDenied')}</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute inset-0 bg-grid-pattern opacity-100" />
				<div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
			</div>

			<GlobalTopNav
				links={[]}
				variant="workspace"
				workspaceRoutes={t('entryNav.workspaceRoutes', { returnObjects: true }) as WorkspaceRoute[]}
				showBrandIcon
				showAuthAction
				showLocaleToggle
				className="xm-landing-glass-nav"
			/>

			<main className="w-[94%] max-w-5xl mx-auto mt-12 mb-12 pb-16 relative z-10 flex flex-col gap-6">
				<header className="flex items-center justify-between">
					<div>
						<h1 className="text-[22px] font-black text-text-primary dark:text-text-primary-dark flex items-center gap-2">
							<BookX className="w-6 h-6" />
							{t('learningCenter.wrongbookPage.title')}
						</h1>
						<p className="text-[13px] font-medium text-text-secondary dark:text-text-secondary-dark mt-1">
							{t('learningCenter.wrongbookPage.subtitle', { count: total })}
						</p>
					</div>
				</header>

				{viewStatus === 'loading' ? (
					<div className="flex items-center justify-center py-24 text-text-secondary dark:text-text-secondary-dark">
						<Loader2 className="w-5 h-5 animate-spin mr-2" />
						<span className="text-sm font-medium">{t('learningCenter.wrongbookPage.loading')}</span>
					</div>
				) : viewStatus === 'error' ? (
					<div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-8 text-center">
						<p className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
							{t('learningCenter.wrongbookPage.loadError')}
						</p>
					</div>
				) : records.length === 0 ? (
					<div className="bg-surface-light dark:bg-surface-dark border border-dashed border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-12 text-center">
						<BookX className="w-10 h-10 text-text-tertiary dark:text-text-tertiary-dark mx-auto mb-4" />
						<p className="text-sm font-bold text-text-primary dark:text-text-primary-dark mb-1">
							{t('learningCenter.wrongbookPage.emptyTitle')}
						</p>
						<p className="text-[13px] font-medium text-text-secondary dark:text-text-secondary-dark">
							{t('learningCenter.wrongbookPage.emptyMessage')}
						</p>
					</div>
				) : (
					<ul className="flex flex-col gap-3">
						{records.map((record) => {
							const isOpen = expanded.has(record.recordId);
							return (
								<li
									key={record.recordId}
									className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl shadow-sm overflow-hidden"
								>
									<button
										type="button"
										onClick={() => toggle(record.recordId)}
										className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-bg-light dark:hover:bg-bg-dark btn-transition"
									>
										<div className="flex-1 min-w-0">
											<h3 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark line-clamp-2">
												{record.displayTitle || record.summary || record.sourceResultId}
											</h3>
											<p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-1">
												{new Date(record.sourceTime).toLocaleString()}
											</p>
										</div>
										<span className="mt-1 text-text-secondary dark:text-text-secondary-dark">
											{isOpen ? (
												<ChevronUp className="w-5 h-5" />
											) : (
												<ChevronDown className="w-5 h-5" />
											)}
										</span>
									</button>
									{isOpen ? (
										<div className="border-t border-bordercolor-light dark:border-bordercolor-dark px-5 py-4 bg-bg-light/50 dark:bg-bg-dark/50">
											<p className="text-[13px] font-medium text-text-primary dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
												{record.summary || t('learningCenter.wrongbookPage.noAnalysis')}
											</p>
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
				)}
			</main>
		</div>
	);
}
