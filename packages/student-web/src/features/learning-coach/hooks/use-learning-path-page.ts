import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useFeedback } from '@/shared/feedback';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import type { LearningCoachSource, LearningPathPlanPayload } from '@/types/learning';

import { buildLearningCoachSource, buildLearningCoachSourceSearchParams } from '../utils/source';

const DEFAULT_CYCLE_DAYS = 3;
const DEFAULT_GOAL = '微积分求导进阶攻坚';

const TIPS = [
  '小麦提示：学习路径生成基于您最近 3 次的学习反馈数据',
  '小麦可以精准定位您的薄弱环节并动态调整题目难度',
  '复杂的概念将自动生成交互式的专属课堂，请耐心等待',
];

function parseIntOrNull(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDefaultSource(searchParams: URLSearchParams): LearningCoachSource {
  const fallbackSessionId = searchParams.get('sourceSessionId') ?? 'manual_session';
  return buildLearningCoachSource({
    sessionId: fallbackSessionId,
    searchParams,
    fallbackSourceType: 'learning',
  });
}

export function useLearningPathPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useFeedback();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

  const source = useMemo(() => buildDefaultSource(searchParams), [searchParams]);
  const [activeView, setActiveView] = useState<'view-generating' | 'view-path'>('view-generating');
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<LearningPathPlanPayload | null>(null);

  const goal = useMemo(() => {
    const raw = searchParams.get('goal');
    return raw && raw.trim() ? raw.trim() : source.topicHint?.trim() || DEFAULT_GOAL;
  }, [searchParams, source.topicHint]);

  const cycleDays = useMemo(() => {
    const raw = parseIntOrNull(searchParams.get('cycleDays'));
    if (raw && raw > 0) return Math.min(raw, 365);
    return DEFAULT_CYCLE_DAYS;
  }, [searchParams]);

  const pathIdParam = searchParams.get('pathId')?.trim() || null;

  const [progressPercent, setProgressPercent] = useState(65);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  const saveAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipVisible(false);
      window.setTimeout(() => {
        setTipIndex((current) => (current + 1) % TIPS.length);
        setTipVisible(true);
      }, 520);
    }, 6000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!planning) return;

    setProgressPercent(65);
    const id = window.setInterval(() => {
      setProgressPercent((current) => {
        if (current >= 92) return current;
        return Math.min(92, current + 1);
      });
    }, 280);

    return () => window.clearInterval(id);
  }, [planning]);

  useEffect(() => {
    saveAttemptedRef.current = null;
  }, [goal, cycleDays, source.sourceSessionId]);

  useEffect(() => {
    let cancelled = false;

    const restoreOrPlan = async () => {
      if (typeof window === 'undefined') return;

      if (pathIdParam) {
        try {
          const stored = await adapter.getPath({ pathId: pathIdParam });
          if (cancelled) return;
          setPlan(stored);
          setActiveView('view-path');
          return;
        } catch {}
      }

      setPlanning(true);
      setActiveView('view-generating');

      try {
        const payload = await adapter.planPath({
          source,
          goal,
          cycleDays,
        });

        if (cancelled) return;

        setPlan(payload);
        setActiveView('view-path');
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set('goal', goal);
          next.set('cycleDays', String(cycleDays));
          next.set('pathId', payload.pathId);
          const sourceParams = buildLearningCoachSourceSearchParams(source);
          for (const [key, value] of sourceParams.entries()) {
            next.set(key, value);
          }
          return next;
        });
      } catch {
        if (!cancelled) {
          notify({ tone: 'error', title: '学习路径生成失败' });
        }
      } finally {
        if (!cancelled) {
          setPlanning(false);
          setProgressPercent(100);
        }
      }
    };

    void restoreOrPlan();

    return () => {
      cancelled = true;
    };
  }, [adapter, cycleDays, goal, notify, pathIdParam, setSearchParams, source]);

  useEffect(() => {
    if (!plan) return;
    if (saveAttemptedRef.current === plan.pathId) return;
    saveAttemptedRef.current = plan.pathId;

    void adapter
      .savePath({ path: plan })
      .then((result) => {
        if (result.persisted) {
          notify({ tone: 'success', title: '学习路径已保存' });
        } else {
          notify({ tone: 'error', title: '学习路径保存失败' });
        }
      })
      .catch(() => {
        notify({ tone: 'error', title: '学习路径保存失败' });
      });
  }, [adapter, notify, plan]);

  const adjustGoal = () => {
    if (typeof window === 'undefined') return;
    const nextGoal = window.prompt('请输入学习目标', goal) ?? '';
    if (!nextGoal.trim()) return;
    const nextCycleRaw = window.prompt('请输入周期（天）', String(cycleDays)) ?? '';
    const nextCycle = Number.parseInt(nextCycleRaw, 10);
    const normalizedCycle = Number.isFinite(nextCycle) && nextCycle > 0 ? Math.min(nextCycle, 365) : cycleDays;

    const next = new URLSearchParams(searchParams);
    next.set('goal', nextGoal.trim());
    next.set('cycleDays', String(normalizedCycle));
    next.delete('pathId');
    setSearchParams(next);
  };

  const enterLearningCenter = () => void navigate(source.returnTo?.trim() || '/video/input');
  const startLearning = () => void navigate('/classroom/input');

  return {
    activeView,
    setActiveView,
    themeMode,
    toggleThemeMode,
    goal,
    cycleDays,
    plan,
    progressPercent,
    tipText: TIPS[tipIndex],
    tipVisible,
    adjustGoal,
    enterLearningCenter,
    startLearning,
  };
}

