/**
 * 课堂生成主 Hook 集。
 *
 * Phase 3 更新：
 * - 等待页的进度流由 `useGenerationTask({ module: 'classroom' })` 统一托管，
 *   内部走 `/api/v1/classroom/tasks/{id}/events` SSE（断线自动降级到
 *   `/api/v1/classroom/tasks/{id}/status` 快照轮询）。
 * - `usePollGeneration` 保留公开签名不变，只是内部改为 SSE 为主、并在
 *   收到 completed 事件时再拉一次 `/generate/classroom/{task_id}` 拿
 *   完整的 classroom payload（SSE 事件只携带最小状态，不把大结果下发）。
 *
 * 后端状态机（FastAPI classroom job_runner）:
 *   pending → generating_outline → generating_scenes → ready | failed
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';
import { useGenerationTask } from '@/shared/hooks/use-generation-task';

import { saveClassroom } from '../db/classroom-db';
import { useClassroomStore } from '../stores/classroom-store';
import type { Classroom, ClassroomCreateRequest, ClassroomJobResponse } from '../types/classroom';
import type { Scene } from '../types/scene';

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

/** 独立路由等待页消费：SSE 订阅 taskId 进度；完成后自动拉取完整 classroom。 */
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
  const fetchAbortRef = useRef<AbortController | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const sse = useGenerationTask({
    taskId,
    module: 'classroom',
    onCompleted: useCallback(() => {
      // SSE 收到 completed，拉取完整 classroom 数据并写入本地 store + IndexedDB。
      if (!taskId) return;
      const ac = new AbortController();
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = ac;

      void (async () => {
        try {
          const statusResp = await adapter.getStatus(taskId, { signal: ac.signal });
          if (ac.signal.aborted) return;
          if (statusResp.status !== 'ready' || !statusResp.classroom) {
            setFetchError(statusResp.error ?? t('classroom.common.classroomGenerationFailed'));
            return;
          }
          const classroom = buildClassroomFromResponse(statusResp, taskId);
          await saveClassroom(classroom);
          store.getState().setClassroom(classroom);
          store.getState().setGenerationProgress(100, t('openmaic.generation.complete'));
          setClassroomId(classroom.id);
        } catch (err) {
          if (ac.signal.aborted) return;
          setFetchError(err instanceof Error ? err.message : String(err));
        }
      })();
    }, [taskId, adapter, store, t]),
  });

  // 把 SSE 的 stageLabel / progress 同步到 classroom store，供其他页面感知。
  useEffect(() => {
    if (!taskId) return;
    const label = sse.stageLabel || t('openmaic.generation.generating');
    store.getState().setGenerationProgress(sse.progress, label);
  }, [sse.progress, sse.stageLabel, taskId, store, t]);

  const cancel = useCallback(() => {
    fetchAbortRef.current?.abort();
  }, []);

  useEffect(() => () => fetchAbortRef.current?.abort(), []);

  const stageLabel = sse.stageLabel || t('openmaic.generation.generating');

  // 最终状态合成：completed 必须在 classroom payload 拉回后才真正落定。
  if (sse.status === 'failed' || fetchError) {
    return {
      status: 'failed',
      progress: sse.progress,
      stageLabel: t('classroom.generation.generationFailed'),
      classroomId: null,
      errorMessage: fetchError ?? sse.error?.message ?? t('classroom.common.classroomGenerationFailed'),
      cancel,
    };
  }

  if (sse.status === 'completed' && classroomId) {
    return {
      status: 'completed',
      progress: 100,
      stageLabel: t('openmaic.generation.complete'),
      classroomId,
      errorMessage: null,
      cancel,
    };
  }

  return {
    status: sse.status === 'completed' ? 'processing' : sse.status,
    progress: sse.progress,
    stageLabel,
    classroomId: null,
    errorMessage: null,
    cancel,
  };
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
