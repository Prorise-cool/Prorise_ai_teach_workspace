/**
 * 文件说明：学习路径规划触发页（Epic 8 消费端闭环）。
 *
 * 让用户输入目标 + 可选 sourceSessionId，调 FastAPI plan_path，保存到 localStorage，
 * 再尝试 save 写回 RuoYi（失败降级），最后跳详情页。
 *
 * 有意跟 features/learning-coach/pages/learning-path-page.tsx 解耦 —— 那个是视频/quiz 完成
 * 后的 hot-path（带高保真 loading 动画），这里是列表页主动入口，UI 简化。
 */
import { Loader2 } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import { useFeedback } from '@/shared/feedback';
import type { LearningCoachSource, LearningPathPlanPayload } from '@/types/learning';

const STORAGE_KEY_PREFIX = 'xm_learning_path_plan:';
const DEFAULT_CYCLE_DAYS = 7;

function storePlan(plan: LearningPathPlanPayload) {
	try {
		window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${plan.pathId}`, JSON.stringify(plan));
	} catch {
		// ignore quota errors
	}
}

export function LearningPathPlannerPage() {
	const { t } = useAppTranslation();
	const { notify } = useFeedback();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

	const [goal, setGoal] = useState(searchParams.get('goal') ?? '');
	const [sourceSessionId, setSourceSessionId] = useState(
		searchParams.get('sourceSessionId') ?? '',
	);
	const [cycleDays, setCycleDays] = useState(DEFAULT_CYCLE_DAYS);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedGoal = goal.trim();
		if (!trimmedGoal) {
			notify({ tone: 'error', title: '请输入学习目标' });
			return;
		}

		setSubmitting(true);
		try {
			const source: LearningCoachSource = {
				sourceType: 'manual',
				sourceSessionId: sourceSessionId.trim() || `manual_${Date.now()}`,
			};
			const payload = await adapter.planPath({
				source,
				goal: trimmedGoal,
				cycleDays,
			});
			storePlan(payload);

			// 非阻塞保存：失败也跳详情（列表次轮刷新会补齐）
			void (async () => {
				try {
					const result = await adapter.savePath({ path: payload });
					if (!result.persisted) {
						notify({ tone: 'error', title: '学习路径保存失败，仅本地可见' });
					}
				} catch {
					notify({ tone: 'error', title: '学习路径保存失败，仅本地可见' });
				}
			})();

			void navigate(`/learning-paths/${encodeURIComponent(payload.pathId)}`);
		} catch (error: unknown) {
			notify({
				tone: 'error',
				title: '学习路径规划失败',
				description: error instanceof Error ? error.message : '稍后再试试',
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute inset-0 bg-grid-pattern opacity-100" />
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

			<main className="w-[94%] max-w-2xl mx-auto mt-12 mb-12 pb-16 relative z-10 flex flex-col gap-6">
				<div>
					<h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
						规划新的学习路径
					</h1>
					<p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
						告诉小麦你想攻克什么，她会规划阶段 + 行动项。
					</p>
				</div>

				<form
					onSubmit={(event) => { void handleSubmit(event); }}
					className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-5"
				>
					<div className="flex flex-col gap-2">
						<label className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest">
							学习目标 *
						</label>
						<input
							type="text"
							value={goal}
							onChange={(e) => setGoal(e.target.value)}
							placeholder="例如：两周内掌握微积分链式法则"
							maxLength={200}
							required
							className="bg-bg-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-lg px-4 py-2.5 text-[14px] text-text-primary dark:text-text-primary-dark focus:border-brand focus:outline-none"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest">
							周期（天）
						</label>
						<input
							type="number"
							min={1}
							max={365}
							value={cycleDays}
							onChange={(e) => setCycleDays(Math.max(1, Math.min(365, Number(e.target.value) || DEFAULT_CYCLE_DAYS)))}
							className="bg-bg-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-lg px-4 py-2.5 text-[14px] text-text-primary dark:text-text-primary-dark focus:border-brand focus:outline-none"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest">
							关联会话 ID（可选）
						</label>
						<input
							type="text"
							value={sourceSessionId}
							onChange={(e) => setSourceSessionId(e.target.value)}
							placeholder="留空系统自动生成 manual_xxx"
							maxLength={128}
							className="bg-bg-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-lg px-4 py-2.5 text-[14px] text-text-primary dark:text-text-primary-dark focus:border-brand focus:outline-none"
						/>
						<p className="text-[11px] text-text-secondary/70 dark:text-text-secondary-dark/70">
							绑定到已有的视频 / quiz 会话时，学习路径会体现来源上下文。
						</p>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-5 py-3 font-bold text-[13px] btn-transition shadow-sm flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{submitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" /> 规划中…
							</>
						) : (
							'开始规划'
						)}
					</button>
				</form>
			</main>
		</div>
	);
}
