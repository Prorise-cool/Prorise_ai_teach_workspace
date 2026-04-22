/**
 * 课堂生成与加载主 Hook。
 * 负责提交生成任务、轮询状态、存储到 IndexedDB、更新 Zustand store。
 */
import { nanoid } from 'nanoid';
import { useCallback, useRef } from 'react';

import { saveClassroom } from '../db/classroom-db';
import { submitClassroom, getClassroomStatus, generateAgentProfiles } from '../api/openmaic-adapter';
import { useClassroomStore } from '../store/classroom-store';
import type { Classroom } from '../types/classroom';
import type { ClassroomCreateRequest } from '../types/classroom';
import { DEFAULT_TEACHER_AGENT } from '../types/agent';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_COUNT = 150; // ~5分钟

export function useClassroomCreate() {
  const store = useClassroomStore;
  const abortRef = useRef<AbortController | null>(null);

  const create = useCallback(
    async (req: ClassroomCreateRequest): Promise<string> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      store.getState().setGenerationProgress(0, '正在提交课堂生成任务...');

      // 1. 提交任务
      const { jobId } = await submitClassroom(req);
      store.getState().setGenerationProgress(5, '任务已提交，等待生成...');

      // 2. 生成智能体档案
      let agents = [DEFAULT_TEACHER_AGENT];
      try {
        const generatedAgents = await generateAgentProfiles({
          requirement: req.requirement,
          sceneCount: 4,
        });
        if (generatedAgents.length > 0) {
          agents = generatedAgents;
        }
      } catch {
        // 使用默认智能体
      }
      store.getState().setAgents(agents);

      // 3. 轮询任务状态
      let pollCount = 0;
      const classroomId = nanoid();

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

        const progress = Math.min(95, 5 + (pollCount / MAX_POLL_COUNT) * 90);
        store.getState().setGenerationProgress(progress, statusResp.message ?? '生成中...');

        if (statusResp.status === 'completed' && statusResp.classroomId) {
          // 任务完成，构建课堂并存储
          const classroom: Classroom = {
            id: statusResp.classroomId ?? classroomId,
            name: req.requirement.slice(0, 50),
            requirement: req.requirement,
            generatedAt: Date.now(),
            updatedAt: Date.now(),
            status: 'ready',
            stage: {
              id: statusResp.classroomId ?? classroomId,
              name: req.requirement.slice(0, 50),
              createdAt: Date.now(),
              updatedAt: Date.now(),
              agentIds: agents.map((a) => a.id),
              generatedAgentConfigs: agents.map((a) => ({
                id: a.id,
                name: a.name,
                role: a.role,
                persona: a.persona,
                avatar: a.avatar,
                color: a.color,
                priority: a.priority ?? 1,
              })),
            },
            scenes: [],
            agents: agents.map((a) => ({
              id: a.id,
              name: a.name,
              role: a.role,
              avatar: a.avatar,
              color: a.color,
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
