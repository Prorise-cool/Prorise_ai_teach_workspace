/**
 * 文件说明：视频任务等待页。
 * 承接视频创建成功后的跳转，同时消费 status / preview / SSE 三路数据，并按设计稿的 6 段式布局组织页面。
 */
import { ArrowLeft, Leaf, Moon, Sparkles, SunMedium, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import '@/features/video/components/task-generating-view.scss';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import type { TaskLifecycleStatus } from '@/types/task';
import type { VideoPreviewSection } from '@/types/video';

import { GeneratingFailureCard } from '../components/generating-failure-card';
import { LogItemRow, type LogItem } from '../components/log-item-row';
import { VideoGeneratingStageContent } from '../components/video-generating-stage-content';
import {
	getLayoutStageConfig,
	resolveVideoGeneratingLayoutStage,
	VIDEO_GENERATING_LAYOUT_STAGES,
	type VideoGeneratingLayoutStageKey,
} from '../config/video-generating-layout';
import { buildStageLog, estimateEtaText } from '../config/video-stages';
import { useVideoTaskPreview } from '../hooks/use-video-task-preview';
import { useVideoTaskSse } from '../hooks/use-video-task-sse';
import { useVideoTaskStatus } from '../hooks/use-video-task-status';
import { useVideoGeneratingStore } from '../stores/video-generating-store';

const COMPLETED_REDIRECT_DELAY_MS = 2000;
const VIDEO_TASK_DRAFT_CACHE_PREFIX = 'video-task-draft:';

function readDraftTitle(taskId: string | undefined, fallback: string) {
	if (!taskId) {
		return fallback;
	}

	try {
		return window.sessionStorage.getItem(`${VIDEO_TASK_DRAFT_CACHE_PREFIX}${taskId}`) || fallback;
	} catch {
		return fallback;
	}
}

function buildStageTags(
	stageKey: VideoGeneratingLayoutStageKey,
	knowledgePoints: string[],
	sections: VideoPreviewSection[],
	readySections: number,
	totalSections: number,
	t: (key: string, options?: Record<string, unknown>) => string,
) {
	if (stageKey === 'summary') {
		return knowledgePoints.slice(0, 3);
	}

	if (stageKey === 'steps') {
		return sections.slice(0, 3).map((section) => section.title).filter(Boolean);
	}

	if (stageKey === 'storyboard') {
		return [t('video.generating.tagStoryboard'), t('video.generating.tagSections', { count: totalSections })];
	}

	if (stageKey === 'assets') {
		return [t('video.generating.tagAudio'), t('video.generating.tagPreviewReady', { count: readySections })];
	}

	if (stageKey === 'renderFlow') {
		return [t('video.generating.tagRealtime'), t('video.generating.tagAutoFix')];
	}

	return [t('video.generating.tagCompose'), t('video.generating.tagDelivery')];
}

function buildRuntimeLogs(
	currentStage: string | null,
	progress: number,
	sections: VideoPreviewSection[],
	t: (key: string, options?: Record<string, unknown>) => string,
): LogItem[] {
	const stageLogs = buildStageLog(currentStage, progress, (label, completed) =>
		completed ? t('video.log.stageCompleted', { stage: t(label) }) : t('video.log.stageInProgress', { stage: t(label) }),
	);
	const sectionLogs = [...sections]
		.sort((left, right) => left.sectionIndex - right.sectionIndex)
		.map<LogItem>((section) => ({
			id: `section-${section.sectionId}`,
			status:
				section.status === 'ready'
					? 'success'
					: section.status === 'fixing'
						? 'warning'
						: section.status === 'failed'
							? 'error'
							: 'pending',
			tag: t('video.generating.sectionFallbackTitle', { index: section.sectionIndex + 1 }),
			text: t(`video.generating.logBySection.${section.status}`, { title: section.title }),
		}));

	return [...stageLogs, ...sectionLogs].slice(-12);
}

export function VideoGeneratingPage() {
	const { id: taskId } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { themeMode, toggleThemeMode } = useThemeMode();
	const { t } = useAppTranslation();
	const [manualSelectedSectionId, setManualSelectedSectionId] = useState<string | null>(null);
	const [manualStageKey, setManualStageKey] = useState<VideoGeneratingLayoutStageKey | null>(null);
	const [pageToast, setPageToast] = useState<{ id: number; text: string } | null>(null);
	const toastTimerRef = useRef<number | null>(null);
	const prevSignalsRef = useRef({ previewAvailable: false, readySections: 0, fixAttempt: 0, degradedToPolling: false, status: 'pending' as TaskLifecycleStatus });

	const { status, progress, currentStage, stageLabel, error, degradedToPolling, fixAttempt, previewAvailable, previewVersion, totalSections, summary, knowledgePoints, sections } =
		useVideoGeneratingStore(useShallow((state) => ({
			status: state.status,
			progress: state.progress,
			currentStage: state.currentStage,
			stageLabel: state.stageLabel,
			error: state.error,
			degradedToPolling: state.degradedToPolling,
			fixAttempt: state.fixAttempt,
			previewAvailable: state.previewAvailable,
			previewVersion: state.previewVersion,
			totalSections: state.totalSections,
			summary: state.summary,
			knowledgePoints: state.knowledgePoints,
			sections: state.sections,
		})));

	const { snapshot, isLoading: isSnapshotLoading, isNotFound } = useVideoTaskStatus(taskId);
	const { preview, isFetching: isPreviewFetching, refetch: refetchPreview } = useVideoTaskPreview(taskId, { enabled: !isSnapshotLoading && !isNotFound });

	useEffect(() => {
		if (!snapshot || isSnapshotLoading || isNotFound) return;
		const store = useVideoGeneratingStore.getState();
		if (store.taskId !== snapshot.taskId || !store.hasHydratedRuntime) store.restoreSnapshot(snapshot);
	}, [snapshot, isSnapshotLoading, isNotFound]);

	useEffect(() => {
		if (preview && preview.previewVersion >= useVideoGeneratingStore.getState().previewVersion) {
			useVideoGeneratingStore.getState().setPreview(preview);
		}
	}, [preview]);

	useEffect(() => {
		if (taskId && previewVersion > 0 && preview?.previewVersion !== previewVersion) void refetchPreview();
	}, [taskId, previewVersion, preview?.previewVersion, refetchPreview]);

	useVideoTaskSse(taskId, { enabled: !isSnapshotLoading && !isNotFound && !['completed', 'failed', 'cancelled'].includes(status) });

	useEffect(() => {
		if (status !== 'completed' || !taskId) return;
		const timer = window.setTimeout(() => void navigate(`/video/${taskId}`, { replace: true }), COMPLETED_REDIRECT_DELAY_MS);
		return () => clearTimeout(timer);
	}, [status, taskId, navigate]);

	const showPageToast = useCallback((text: string) => {
		if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
		setPageToast({ id: Date.now(), text });
		toastTimerRef.current = window.setTimeout(() => setPageToast(null), 3200);
	}, []);

	useEffect(() => () => {
		if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
	}, []);

	const readySections = sections.filter((section) => section.status === 'ready').length;
	useEffect(() => {
		const prev = prevSignalsRef.current;
		if (!prev.previewAvailable && previewAvailable) showPageToast(t('video.generating.toast.previewReady'));
		if (readySections > prev.readySections) showPageToast(t('video.generating.toast.sectionReady', { count: readySections }));
		if (fixAttempt > prev.fixAttempt && fixAttempt > 0) showPageToast(t('video.generating.toast.fixing'));
		if (degradedToPolling && !prev.degradedToPolling) showPageToast(t('video.generating.toast.polling'));
		if (status === 'completed' && prev.status !== 'completed') showPageToast(t('video.generating.toast.completed'));
		prevSignalsRef.current = { previewAvailable, readySections, fixAttempt, degradedToPolling, status };
	}, [degradedToPolling, fixAttempt, previewAvailable, readySections, showPageToast, status, t]);

	const displayTotalSections = Math.max(totalSections, sections.length);
	const activeStageKey = resolveVideoGeneratingLayoutStage(currentStage, status);
	const activeStageIndex = VIDEO_GENERATING_LAYOUT_STAGES.findIndex((stage) => stage.key === activeStageKey);
	const manualStageIndex = manualStageKey ? VIDEO_GENERATING_LAYOUT_STAGES.findIndex((stage) => stage.key === manualStageKey) : -1;
	useEffect(() => {
		if (manualStageIndex > activeStageIndex) setManualStageKey(null);
	}, [activeStageIndex, manualStageIndex]);

	const displayStageKey = manualStageKey ?? activeStageKey;
	const displayStageConfig = getLayoutStageConfig(displayStageKey);
	const selectedSectionId = manualSelectedSectionId && sections.some((section) => section.sectionId === manualSelectedSectionId)
		? manualSelectedSectionId
		: (sections.find((section) => section.status === 'ready') ?? sections.find((section) => section.status !== 'pending') ?? sections[0])?.sectionId ?? null;
	const etaText = t(estimateEtaText(progress));
	const logs = useMemo(() => buildRuntimeLogs(currentStage, progress, sections, t), [currentStage, progress, sections, t]);
	const titleText = readDraftTitle(taskId, summary || t('video.generating.defaultTitle'));
	const stageTags = buildStageTags(displayStageKey, knowledgePoints, sections, readySections, displayTotalSections, t);

	const handleReturn = useCallback(() => void navigate('/video/input'), [navigate]);
	const handleRetry = useCallback(() => void navigate('/video/input?retry=1', { replace: true }), [navigate]);

	if (isSnapshotLoading) return <div className="xm-generating-loading"><Sparkles className="h-8 w-8 animate-pulse text-primary" /><p>{t('video.generating.loadingSubtitle')}</p></div>;
	if (isNotFound) return <div className="xm-generating-loading"><h2>{t('video.generating.notFoundTitle')}</h2><p>{t('video.generating.notFoundMessage', { taskId: taskId ?? '' })}</p><button onClick={handleReturn}>{t('video.common.returnToInput')}</button></div>;
	if (status === 'failed' || status === 'cancelled') return <div className="min-h-screen flex items-center justify-center bg-background px-6"><GeneratingFailureCard errorCode={error?.errorCode ?? null} errorMessage={error?.errorMessage ?? null} failedStage={error?.failedStage ?? null} retryable={error?.retryable ?? false} onRetry={handleRetry} onReturn={handleReturn} /></div>;

	return (
		<div className="xm-generating-shell">
			<div className="xm-generating-ambient-glow" />
			<div className="xm-generating-bg-grid xm-generating-shell__grid" />

			<header className="xm-generating-shell__header">
				<button type="button" className="xm-generating-shell__brand" onClick={handleReturn}>
					<span className="xm-generating-shell__brand-icon"><Leaf className="h-4 w-4" /></span>
					<span>XiaoMai</span>
				</button>

				<nav className="xm-generating-shell__nav" aria-label={t('video.generating.navAriaLabel')}>
					{VIDEO_GENERATING_LAYOUT_STAGES.map((stage, index) => (
						<button
							key={stage.key}
							type="button"
							onClick={() => index <= activeStageIndex && setManualStageKey(stage.key)}
							disabled={index > activeStageIndex}
							className={cn('xm-generating-shell__nav-btn', displayStageKey === stage.key && 'is-active', index > activeStageIndex && 'is-locked')}
						>
							{index + 1}. {t(stage.labelKey)}
						</button>
					))}
				</nav>

				<div className="xm-generating-shell__actions">
					<button type="button" className="xm-generating-shell__cta" onClick={handleReturn}>
						<ArrowLeft className="h-4 w-4" />
						<span>{t('video.common.returnToInput')}</span>
					</button>
					<button type="button" className="xm-generating-shell__theme" onClick={toggleThemeMode} aria-label={t('video.generating.toggleTheme')}>
						{themeMode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
				</div>
			</header>

			<div className={cn('xm-generating-toast', pageToast && 'is-visible')}>
				<div className="xm-generating-toast__icon"><Sparkles className="h-4 w-4" /></div>
				<span>{pageToast?.text}</span>
			</div>

			<main className="xm-generating-shell__layout">
				<section className="xm-generating-shell__aside">
					<div className="xm-generating-shell__progress-card">
						<div className="xm-generating-shell__progress-head">
							<div className="space-y-2">
								<div className="xm-generating-shell__status-line">
									<span className="xm-generating-shell__status-dot" />
									<span>{t(displayStageConfig.statusKey)}</span>
								</div>
								<h1 className="xm-generating-shell__title">{titleText}</h1>
								<p className="xm-generating-shell__subtitle">{t(displayStageConfig.subtitleKey)}</p>
							</div>
							<div className="space-y-1 text-right">
								<p className="xm-generating-shell__eta">{etaText}</p>
								<p className="xm-generating-shell__progress-value">{Math.round(progress)}%</p>
							</div>
						</div>

						<div className="xm-generating-shell__progress-track">
							<div className="xm-generating-progress-fill xm-generating-shell__progress-bar" style={{ width: `${progress}%` }} />
						</div>

						<div className="xm-generating-shell__tags">
							{stageTags.map((tag) => <span key={tag} className="xm-generating-shell__tag">{tag}</span>)}
							{previewVersion > 0 ? <span className="xm-generating-shell__tag">Preview v{previewVersion}</span> : null}
						</div>

						<div className="xm-generating-shell__live-pill">
							{degradedToPolling ? <WifiOff className="h-4 w-4 text-warning" /> : <Sparkles className="h-4 w-4 text-primary" />}
							<span>{degradedToPolling ? t('video.generating.connectionPolling') : t(stageLabel)}</span>
						</div>
					</div>

					<div className="xm-generating-glass-panel xm-generating-shell__log-card">
						<div className="xm-generating-shell__log-head">{t('video.generating.logTitle')}</div>
						<div className="xm-generating-log-container xm-generating-shell__log-scroll">
							<div className="xm-generating-shell__log-list">
								<AnimatePresence initial={false}>{logs.map((log) => <LogItemRow key={log.id} item={log} />)}</AnimatePresence>
							</div>
						</div>
					</div>
				</section>

				<section className="xm-generating-shell__panel">
					<AnimatePresence mode="wait">
						<motion.div
							key={displayStageKey}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -12 }}
							transition={{ duration: 0.32 }}
							className="h-full"
						>
							<VideoGeneratingStageContent
								stageKey={displayStageKey}
								status={status}
								previewAvailable={previewAvailable}
								summary={summary}
								knowledgePoints={knowledgePoints}
								sections={sections}
								selectedSectionId={selectedSectionId}
								onSelectSection={setManualSelectedSectionId}
								totalSections={displayTotalSections}
								readySections={readySections}
								isRefreshing={isPreviewFetching}
							/>
						</motion.div>
					</AnimatePresence>
				</section>
			</main>
		</div>
	);
}
