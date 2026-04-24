/**
 * 课堂生成主 Hook 集。
 *
 * 重构说明（Phase 2）：
 * - `useClassroomCreate().create()` 现在只做提交 → 拿到 taskId 立即返回；
 *   轮询与课堂保存由独立路由 `/classroom/generating/:taskId` 内部的
 *   `usePollGeneration(taskId)` 接管。
 *
 * 后端状态机（FastAPI classroom job_runner）:
 *   pending → generating_outline → generating_scenes → ready | failed
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';

import { saveClassroom } from '../db/classroom-db';
import { useClassroomStore } from '../stores/classroom-store';
import type { Classroom, ClassroomCreateRequest, ClassroomJobResponse } from '../types/classroom';
import type { Scene } from '../types/scene';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_COUNT = 150; // ~5 分钟

/** 提交课堂生成任务，返回后端 taskId。不再内部阻塞等待结果。 */
export function useClassroomCreate() {
  const { t } = useAppTranslation();
  const store = useClassroomStore;
  const abortRef = useRef<AbortController | null>(null);
  const adapter = resolveClassroomAdapter();

  const create = useCallback(
    async (req: ClassroomCreateRequest): Promise<string> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      store.getState().setGenerationProgress(0, t('openmaic.generation.submitting'));
      const { taskId } = await adapter.submit(req, { signal: ac.signal });
      store.getState().setGenerationProgress(5, t('openmaic.generation.generating'));
      return taskId;
    },
    [store, adapter, t],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { create, cancel };
}

/** 独立路由等待页消费：轮询 taskId 状态直到 ready / failed / 超时。 */
export interface UsePollGenerationResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stageLabel: string;
  classroomId: string | null;
  errorMessage: string | null;
  cancel: () => void;
}

export function usePollGeneration(taskId: string | undefined): UsePollGenerationResult {
  const { t } = useAppTranslation();
  const store = useClassroomStore;
  const adapter = resolveClassroomAdapter();
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<Omit<UsePollGenerationResult, 'cancel'>>({
    status: 'pending',
    progress: 0,
    stageLabel: t('openmaic.generation.generating'),
    classroomId: null,
    errorMessage: null,
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const ac = new AbortController();
    abortRef.current = ac;
    let cancelled = false;
    let pollCount = 0;

    async function loop() {
      setState((prev) => ({ ...prev, status: 'processing' }));

      while (!cancelled && pollCount < MAX_POLL_COUNT) {
        if (ac.signal.aborted) {
          return;
        }
        await sleep(POLL_INTERVAL_MS);
        if (cancelled || ac.signal.aborted) return;

        let statusResp: ClassroomJobResponse | null = null;
        try {
          statusResp = await adapter.getStatus(taskId as string, { signal: ac.signal });
        } catch {
          pollCount += 1;
          continue;
        }
        if (cancelled || ac.signal.aborted) return;

        const serverProgress = typeof statusResp.progress === 'number' ? statusResp.progress : 0;
        const progress = serverProgress > 0
          ? serverProgress
          : Math.min(95, 5 + (pollCount / MAX_POLL_COUNT) * 90);
        const stageLabel = statusResp.message ?? t('openmaic.generation.generating');
        store.getState().setGenerationProgress(progress, stageLabel);
        setState((prev) => ({ ...prev, progress, stageLabel }));

        if (statusResp.status === 'ready' && statusResp.classroom) {
          try {
            const classroom = buildClassroomFromResponse(statusResp, taskId as string);
            await saveClassroom(classroom);
            store.getState().setClassroom(classroom);
            store.getState().setGenerationProgress(100, t('openmaic.generation.complete'));
            if (!cancelled) {
              setState({
                status: 'completed',
                progress: 100,
                stageLabel: t('openmaic.generation.complete'),
                classroomId: classroom.id,
                errorMessage: null,
              });
            }
          } catch (err) {
            if (!cancelled) {
              setState({
                status: 'failed',
                progress: serverProgress,
                stageLabel: t('classroom.generation.generationFailed'),
                classroomId: null,
                errorMessage: err instanceof Error ? err.message : String(err),
              });
            }
          }
          return;
        }

        if (statusResp.status === 'failed') {
          if (!cancelled) {
            setState({
              status: 'failed',
              progress: serverProgress,
              stageLabel: t('classroom.generation.generationFailed'),
              classroomId: null,
              errorMessage: statusResp.error ?? t('classroom.common.classroomGenerationFailed'),
            });
          }
          return;
        }

        pollCount += 1;
      }

      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          status: 'failed',
          errorMessage: t('openmaic.generation.timeout'),
        }));
      }
    }

    void loop();

    return () => {
      cancelled = true;
      ac.abort();
    };
  // adapter/store/t 在实际使用中是稳定的（adapter 是模块级单例，store 是 Zustand，t 来自 i18next hook）。
  // 把它们放入依赖会让 taskId 变更外再次触发，反而有重复轮询风险。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return { ...state, cancel };
}

function buildClassroomFromResponse(statusResp: ClassroomJobResponse, taskId: string): Classroom {
  const remoteClassroom = (statusResp.classroom ?? {}) as Record<string, unknown> & {
    id?: string;
    name?: string;
    requirement?: string;
    generatedAt?: number;
    scenes?: unknown[];
    agents?: Record<string, unknown>[];
  };
  const localId = remoteClassroom.id ?? taskId;
  const scenes = (Array.isArray(remoteClassroom.scenes) ? remoteClassroom.scenes : []) as unknown as Scene[];
  const agents = (Array.isArray(remoteClassroom.agents)
    ? (remoteClassroom.agents as Record<string, unknown>[])
    : []) as Record<string, unknown>[];
  const requirement = (remoteClassroom.requirement as string) ?? '';
  const fallbackName = requirement ? requirement.slice(0, 50) : '';
  const name = (remoteClassroom.name as string) ?? fallbackName;

  return {
    id: localId,
    name,
    requirement,
    generatedAt: remoteClassroom.generatedAt ?? Date.now(),
    updatedAt: Date.now(),
    status: 'ready',
    stage: {
      id: localId,
      name,
      createdAt: remoteClassroom.generatedAt ?? Date.now(),
      updatedAt: Date.now(),
      agentIds: agents.map((a) => a.id as string),
      generatedAgentConfigs: agents.map((a) => ({
        id: a.id as string,
        name: a.name as string,
        role: a.role as string,
        persona: (a.persona ?? '') as string,
        avatar: (a.avatar ?? '') as string,
        color: (a.color ?? '#4A90D9') as string,
        priority: 1,
      })),
    },
    scenes,
    agents: agents.map((a) => ({
      id: a.id as string,
      name: a.name as string,
      role: a.role as string,
      avatar: (a.avatar ?? '') as string,
      color: (a.color ?? '#4A90D9') as string,
    })),
    taskId,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
