/**
 * 课堂生成与加载主 Hook。
 * 负责提交生成任务、轮询状态、存储到 IndexedDB、更新 Zustand store。
 *
 * 后端状态机（FastAPI openmaic job_runner）:
 *   pending → generating_outline → generating_scenes → ready | failed
 *
 * 后端 /classroom/{id} 响应形状:
 *   { jobId, status, progress, message?, classroom?, error? }
 *   其中 classroom 包含 scenes / agents / requirement 完整数据。
 */
import { useCallback, useRef } from 'react';

import { saveClassroom } from '../db/classroom-db';
import { submitClassroom, getClassroomStatus } from '../api/openmaic-adapter';
import { useClassroomStore } from '../store/classroom-store';
import type { Classroom } from '../types/classroom';
import type { ClassroomCreateRequest } from '../types/classroom';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_COUNT = 150; // ~5 分钟

export function useClassroomCreate() {
  const store = useClassroomStore;
  const abortRef = useRef<AbortController | null>(null);

  const create = useCallback(
    async (req: ClassroomCreateRequest): Promise<string> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      store.getState().setGenerationProgress(0, '正在提交课堂生成任务...');

      // 1. 提交任务 → 获取 jobId
      const { jobId } = await submitClassroom(req);
      store.getState().setGenerationProgress(5, '任务已提交，等待生成...');

      // 2. 轮询任务状态（后端已做 outline + agent profiles + scene 全链路编排）
      let pollCount = 0;

      while (pollCount < MAX_POLL_COUNT) {
        if (ac.signal.aborted) throw new Error('已取消');
        await sleep(POLL_INTERVAL_MS);

        let statusResp;
        try {
          statusResp = await getClassroomStatus(jobId);
        } catch {
          pollCount++;
          continue;
        }

        // 用后端真实 progress；fallback 到递增估计
        const serverProgress = typeof statusResp.progress === 'number' ? statusResp.progress : 0;
        const progress = serverProgress > 0
          ? serverProgress
          : Math.min(95, 5 + (pollCount / MAX_POLL_COUNT) * 90);
        store.getState().setGenerationProgress(progress, statusResp.message ?? '生成中...');

        // 后端 ready 状态对应前端 completed
        if (statusResp.status === 'ready' && statusResp.classroom) {
          // 后端回传 JSON 形状由 FastAPI 约束但 TS 侧保留 unknown，需要显式转换
          const remoteClassroom = statusResp.classroom as Record<string, unknown> & {
            id?: string;
            name?: string;
            requirement?: string;
            generatedAt?: number;
            scenes?: unknown[];
            agents?: Record<string, unknown>[];
          };
          const localId = remoteClassroom.id ?? jobId;
          const scenes = (Array.isArray(remoteClassroom.scenes) ? remoteClassroom.scenes : []) as unknown as import('../types/scene').Scene[];
          const agents = (Array.isArray(remoteClassroom.agents)
            ? (remoteClassroom.agents as Record<string, unknown>[])
            : []) as Record<string, unknown>[];

          const classroom: Classroom = {
            id: localId,
            name: remoteClassroom.name ?? req.requirement.slice(0, 50),
            requirement: remoteClassroom.requirement ?? req.requirement,
            generatedAt: remoteClassroom.generatedAt ?? Date.now(),
            updatedAt: Date.now(),
            status: 'ready',
            stage: {
              id: localId,
              name: remoteClassroom.name ?? req.requirement.slice(0, 50),
              createdAt: remoteClassroom.generatedAt ?? Date.now(),
              updatedAt: Date.now(),
              agentIds: agents.map((a) => a.id as string),
              generatedAgentConfigs: agents.map((a: Record<string, unknown>) => ({
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
            agents: agents.map((a: Record<string, unknown>) => ({
              id: a.id as string,
              name: a.name as string,
              role: a.role as string,
              avatar: (a.avatar ?? '') as string,
              color: (a.color ?? '#4A90D9') as string,
            })),
            jobId,
          };
          await saveClassroom(classroom);
          store.getState().setClassroom(classroom);
          store.getState().setGenerationProgress(100, '课堂生成完成！');
          return classroom.id;
        }

        if (statusResp.status === 'failed') {
          throw new Error(statusResp.error ?? '课堂生成失败');
        }

        pollCount++;
      }

      throw new Error('课堂生成超时，请稍后重试');
    },
    [store],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { create, cancel };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
