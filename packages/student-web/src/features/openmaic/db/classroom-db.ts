/**
 * Dexie IndexedDB 数据库模式定义。
 * 存储课堂数据、场景、聊天历史、白板历史和草稿缓存。
 */
import Dexie, { type Table } from 'dexie';

import type { Classroom, ClassroomMeta } from '../types/classroom';
import type { ChatMessage } from '../types/chat';
import type { Scene } from '../types/scene';

/** 白板历史记录条目 */
export interface WhiteboardHistoryEntry {
  id?: number; // Dexie auto-increment key
  classroomId: string;
  sceneId: string;
  elements: unknown[];
  savedAt: number;
}

/** 草稿缓存条目 */
export interface DraftCacheEntry {
  key: string; // 主键（e.g., "classroom-draft:topic:xxx"）
  data: unknown;
  savedAt: number;
  expiresAt?: number;
}

/** 聊天历史条目（按 classroomId 分组） */
export interface ChatHistoryEntry {
  id?: number;
  classroomId: string;
  messages: ChatMessage[];
  savedAt: number;
}

class ClassroomDatabase extends Dexie {
  classrooms!: Table<Classroom, string>;
  scenes!: Table<Scene & { classroomId: string }, string>;
  chatHistory!: Table<ChatHistoryEntry, number>;
  whiteboardHistory!: Table<WhiteboardHistoryEntry, number>;
  draftCache!: Table<DraftCacheEntry, string>;

  constructor() {
    super('openmaic-classroom-db');

    this.version(1).stores({
      classrooms: 'id, status, generatedAt, updatedAt',
      scenes: 'id, classroomId, order, type',
      chatHistory: '++id, classroomId, savedAt',
      whiteboardHistory: '++id, classroomId, sceneId, savedAt',
      draftCache: 'key, savedAt, expiresAt',
    });
  }
}

// 单例实例
let _db: ClassroomDatabase | null = null;

export function getClassroomDb(): ClassroomDatabase {
  if (!_db) {
    _db = new ClassroomDatabase();
  }
  return _db;
}

/** 保存或更新课堂记录 */
export async function saveClassroom(classroom: Classroom): Promise<void> {
  const db = getClassroomDb();
  await db.classrooms.put(classroom);
}

/** 读取单个课堂 */
export async function loadClassroom(classroomId: string): Promise<Classroom | undefined> {
  const db = getClassroomDb();
  return db.classrooms.get(classroomId);
}

/** 读取所有课堂元数据（用于列表展示） */
export async function listClassroomMetas(): Promise<ClassroomMeta[]> {
  const db = getClassroomDb();
  const classrooms = await db.classrooms.orderBy('generatedAt').reverse().toArray();
  return classrooms.map((c) => ({
    id: c.id,
    name: c.name,
    requirement: c.requirement,
    generatedAt: c.generatedAt,
    status: c.status,
    sceneCount: c.scenes.length,
  }));
}

/** 删除课堂及其关联数据 */
export async function deleteClassroom(classroomId: string): Promise<void> {
  const db = getClassroomDb();
  await db.transaction('rw', db.classrooms, db.scenes, db.chatHistory, db.whiteboardHistory, async () => {
    await db.classrooms.delete(classroomId);
    await db.scenes.where('classroomId').equals(classroomId).delete();
    await db.chatHistory.where('classroomId').equals(classroomId).delete();
    await db.whiteboardHistory.where('classroomId').equals(classroomId).delete();
  });
}

/** 保存聊天历史 */
export async function saveChatHistory(classroomId: string, messages: ChatMessage[]): Promise<void> {
  const db = getClassroomDb();
  const existing = await db.chatHistory.where('classroomId').equals(classroomId).first();
  if (existing?.id !== undefined) {
    await db.chatHistory.update(existing.id, { messages, savedAt: Date.now() });
  } else {
    await db.chatHistory.add({ classroomId, messages, savedAt: Date.now() });
  }
}

/** 读取聊天历史 */
export async function loadChatHistory(classroomId: string): Promise<ChatMessage[]> {
  const db = getClassroomDb();
  const entry = await db.chatHistory.where('classroomId').equals(classroomId).first();
  return entry?.messages ?? [];
}
