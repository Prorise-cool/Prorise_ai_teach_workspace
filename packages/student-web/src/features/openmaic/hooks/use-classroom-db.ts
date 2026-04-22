/**
 * Dexie 课堂数据库 React Hook。
 * 提供加载、保存、列表课堂的响应式接口。
 */
import { useCallback, useEffect, useState } from 'react';

import {
  saveClassroom,
  loadClassroom,
  listClassroomMetas,
  deleteClassroom,
} from '../db/classroom-db';
import type { Classroom, ClassroomMeta } from '../types/classroom';

/** 读取最近课堂元数据列表 */
export function useRecentClassrooms() {
  const [metas, setMetas] = useState<ClassroomMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listClassroomMetas();
      setMetas(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteClassroom(id);
      await refresh();
    },
    [refresh],
  );

  return { metas, isLoading, refresh, remove };
}

/** 读取单个课堂 */
export function useLoadClassroom(classroomId: string | null) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const c = await loadClassroom(id);
      setClassroom(c ?? null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    void load(classroomId);
  }, [classroomId, load]);

  const save = useCallback(async (c: Classroom) => {
    await saveClassroom(c);
    setClassroom(c);
  }, []);

  return { classroom, isLoading, error, save };
}
