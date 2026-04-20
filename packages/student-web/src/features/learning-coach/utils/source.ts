/**
 * 文件说明：Learning Coach 路由参数解析（Epic 8）。
 * 保证 `/coach/:sessionId`、`/checkpoint/:sessionId`、`/quiz/:sessionId` 刷新后仍可恢复来源上下文。
 */
import type { LearningCoachSource, LearningCoachSourceType } from '@/types/learning';
import { LEARNING_COACH_SOURCE_TYPE_VALUES } from '@/types/learning';

export function isLearningCoachSourceType(value: unknown): value is LearningCoachSourceType {
  return (
    typeof value === 'string' &&
    (LEARNING_COACH_SOURCE_TYPE_VALUES as readonly string[]).includes(value)
  );
}

function readNullableParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value === null || value.trim() === '' ? null : value;
}

export function buildLearningCoachSource(params: {
  sessionId: string;
  searchParams: URLSearchParams;
  fallbackSourceType?: LearningCoachSourceType;
}): LearningCoachSource {
  const { sessionId, searchParams, fallbackSourceType = 'manual' } = params;
  const rawSourceType = readNullableParam(searchParams, 'sourceType');

  return {
    sourceType: isLearningCoachSourceType(rawSourceType) ? rawSourceType : fallbackSourceType,
    sourceSessionId: readNullableParam(searchParams, 'sourceSessionId') ?? sessionId,
    sourceTaskId: readNullableParam(searchParams, 'sourceTaskId'),
    sourceResultId: readNullableParam(searchParams, 'sourceResultId'),
    returnTo: readNullableParam(searchParams, 'returnTo'),
    topicHint: readNullableParam(searchParams, 'topicHint'),
  };
}

export function buildLearningCoachSourceSearchParams(source: LearningCoachSource) {
  const params = new URLSearchParams();
  params.set('sourceType', source.sourceType);
  params.set('sourceSessionId', source.sourceSessionId);
  if (source.sourceTaskId) params.set('sourceTaskId', String(source.sourceTaskId));
  if (source.sourceResultId) params.set('sourceResultId', String(source.sourceResultId));
  if (source.returnTo) params.set('returnTo', String(source.returnTo));
  if (source.topicHint) params.set('topicHint', String(source.topicHint));
  return params;
}

