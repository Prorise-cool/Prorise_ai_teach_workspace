/**
 * 文件说明：提供视频结果详情的 mock / real adapter 抽象。
 * 统一收口结果页查询路径与响应映射，避免页面层自行区分 mock / real。
 */
import {
  type ApiClient,
  isApiClientError,
} from '@/services/api/client';
import { fastapiClient } from '@/services/api/fastapi-client';
import {
  getMockVideoFailure,
  getMockVideoResult,
} from '@/services/mock/fixtures/video-pipeline';
import type {
  VideoFailure,
  VideoLayoutHint,
  VideoPipelineMockScenario,
  VideoResult,
  VideoResultSection,
} from '@/types/video';

import { pickAdapterImplementation } from './base-adapter';

type VideoResultQueryOptions = {
  scenario?: VideoPipelineMockScenario;
  signal?: AbortSignal;
};

type ResolveVideoResultAdapterOptions = {
  client?: ApiClient;
  useMock?: boolean;
};

type RealVideoResultAdapterOptions = {
  client?: ApiClient;
};

type VideoResultEnvelope = {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: string;
    result: Record<string, unknown> | null;
    sections?: unknown[] | null;
    timeline?: unknown[] | null;
    narration?: unknown[] | null;
    publicUrl?: string | null;
    failure: VideoFailure | null;
    publishState?: {
      published?: boolean;
      publicUrl?: string | null;
    } | null;
  };
};

export interface VideoResultData {
  taskId: string;
  status: string;
  result: VideoResult | null;
  failure: VideoFailure | null;
}

export interface VideoResultAdapter {
  getResult(
    taskId: string,
    options?: VideoResultQueryOptions,
  ): Promise<VideoResultData>;
  getPublicResult(
    resultId: string,
    options?: VideoResultQueryOptions,
  ): Promise<VideoResultData>;
}

export class VideoResultAdapterError extends Error {
  name = 'VideoResultAdapterError' as const;

  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function createVideoResultError(status: number, code: string, message: string) {
  return new VideoResultAdapterError(status, code, message);
}

function inferPipelineScenario(
  taskId: string,
  explicitScenario?: VideoPipelineMockScenario,
): VideoPipelineMockScenario {
  if (explicitScenario) {
    return explicitScenario;
  }

  if (taskId.includes('fix')) {
    return 'fix';
  }

  if (taskId.includes('fail')) {
    return 'failure';
  }

  return 'success';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

const VALID_LAYOUT_HINTS = new Set<string>(['center_stage', 'two_column']);

function readLayoutHint(value: unknown): VideoLayoutHint | undefined {
  if (typeof value === 'string' && VALID_LAYOUT_HINTS.has(value)) {
    return value as VideoLayoutHint;
  }

  return undefined;
}

function toSectionRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function buildSectionKey(section: VideoResultSection) {
  return section.sectionId || `section_${section.sectionIndex + 1}`;
}

function normalizeSectionPayload(
  rawSection: Record<string, unknown>,
  fallbackIndex: number,
): VideoResultSection {
  return {
    sectionId:
      readString(rawSection.sectionId) ??
      readString(rawSection.id) ??
      `section_${fallbackIndex + 1}`,
    sectionIndex:
      readNumber(rawSection.sectionIndex) ??
      readNumber(rawSection.index) ??
      fallbackIndex,
    title:
      readString(rawSection.title) ??
      readString(rawSection.heading) ??
      undefined,
    summary:
      readString(rawSection.summary) ??
      readString(rawSection.description) ??
      undefined,
    subtitleText:
      readString(rawSection.subtitleText) ??
      readString(rawSection.subtitle_text) ??
      readString(rawSection.subtitle) ??
      null,
    ttsText:
      readString(rawSection.ttsText) ??
      readString(rawSection.tts_text) ??
      null,
    narrationText:
      readString(rawSection.narrationText) ??
      readString(rawSection.narration_text) ??
      readString(rawSection.text) ??
      null,
    lectureLines:
      readStringArray(rawSection.lectureLines).length > 0
        ? readStringArray(rawSection.lectureLines)
        : readStringArray(rawSection.lecture_lines),
    startSeconds:
      readNumber(rawSection.startSeconds) ??
      readNumber(rawSection.start_seconds) ??
      readNumber(rawSection.startTime) ??
      readNumber(rawSection.start_time) ??
      null,
    endSeconds:
      readNumber(rawSection.endSeconds) ??
      readNumber(rawSection.end_seconds) ??
      readNumber(rawSection.endTime) ??
      readNumber(rawSection.end_time) ??
      null,
    durationSeconds:
      readNumber(rawSection.durationSeconds) ??
      readNumber(rawSection.duration_seconds) ??
      null,
  };
}

function readSectionCollection(
  payload: VideoResultEnvelope['data'],
  resultPayload: Record<string, unknown>,
) {
  const candidates = [
    payload.sections,
    resultPayload.sections,
    resultPayload.sectionSummaries,
    resultPayload.chapters,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    return candidate
      .map(toSectionRecord)
      .filter((section): section is Record<string, unknown> => section !== null);
  }

  return [];
}

function readTimelineCollection(
  payload: VideoResultEnvelope['data'],
  resultPayload: Record<string, unknown>,
) {
  const candidates = [payload.timeline, resultPayload.timeline];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    return candidate
      .map(toSectionRecord)
      .filter((section): section is Record<string, unknown> => section !== null);
  }

  return [];
}

function readNarrationCollection(
  payload: VideoResultEnvelope['data'],
  resultPayload: Record<string, unknown>,
) {
  const candidates = [payload.narration, resultPayload.narration];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    return candidate
      .map(toSectionRecord)
      .filter((section): section is Record<string, unknown> => section !== null);
  }

  return [];
}

function buildNormalizedSections(
  payload: VideoResultEnvelope['data'],
  rawResult: Record<string, unknown>,
) {
  const mergedSections = new Map<string, VideoResultSection>();

  const overlaySection = (sectionPayload: Record<string, unknown>, fallbackIndex: number) => {
    const normalizedSection = normalizeSectionPayload(sectionPayload, fallbackIndex);
    const key = buildSectionKey(normalizedSection);
    const currentSection = mergedSections.get(key);

    mergedSections.set(
      key,
      currentSection
        ? {
            ...currentSection,
            ...normalizedSection,
            sectionId: currentSection.sectionId || normalizedSection.sectionId,
            sectionIndex: currentSection.sectionIndex ?? normalizedSection.sectionIndex,
            title: normalizedSection.title ?? currentSection.title,
            summary: normalizedSection.summary ?? currentSection.summary,
            subtitleText: normalizedSection.subtitleText ?? currentSection.subtitleText,
            ttsText: normalizedSection.ttsText ?? currentSection.ttsText,
            narrationText: normalizedSection.narrationText ?? currentSection.narrationText,
            lectureLines: normalizedSection.lectureLines ?? currentSection.lectureLines,
            startSeconds: normalizedSection.startSeconds ?? currentSection.startSeconds,
            endSeconds: normalizedSection.endSeconds ?? currentSection.endSeconds,
            durationSeconds:
              normalizedSection.durationSeconds ?? currentSection.durationSeconds,
          }
        : normalizedSection,
    );
  };

  readSectionCollection(payload, rawResult).forEach((sectionPayload, index) => {
    overlaySection(sectionPayload, index);
  });

  readTimelineCollection(payload, rawResult).forEach((sectionPayload, index) => {
    overlaySection(sectionPayload, index);
  });

  readNarrationCollection(payload, rawResult).forEach((sectionPayload, index) => {
    overlaySection(sectionPayload, index);
  });

  return [...mergedSections.values()].sort(
    (left, right) => left.sectionIndex - right.sectionIndex,
  );
}

function normalizeMockPublicResult(resultId: string) {
  const mockResult = getMockVideoResult(resultId);

  return {
    ...mockResult,
    resultId,
    publicUrl: `https://app.prorise.test/video/public/${resultId}`,
    published: true,
  };
}

function normalizeResultPayload(
  payload: VideoResultEnvelope['data'],
): VideoResult | null {
  if (!payload.result || !isRecord(payload.result)) {
    return null;
  }

  const rawResult = payload.result;
  const normalizedSections = buildNormalizedSections(payload, rawResult);

  return {
    taskId: readString(rawResult.taskId) ?? payload.taskId,
    taskType: 'video',
    videoUrl: readString(rawResult.videoUrl) ?? '',
    coverUrl: readString(rawResult.coverUrl) ?? '',
    duration: readNumber(rawResult.duration) ?? 0,
    summary: readString(rawResult.summary) ?? '',
    knowledgePoints: readStringArray(rawResult.knowledgePoints),
    resultId: readString(rawResult.resultId) ?? '',
    completedAt: readString(rawResult.completedAt) ?? '',
    aiContentFlag: readBoolean(rawResult.aiContentFlag) ?? false,
    title: readString(rawResult.title) ?? '',
    providerUsed: isRecord(rawResult.providerUsed)
      ? (rawResult.providerUsed as Record<string, string[]>)
      : undefined,
    published:
      payload.publishState?.published ??
      readBoolean(rawResult.published) ??
      false,
    publicUrl:
      readString(payload.publicUrl) ??
      readString(payload.publishState?.publicUrl) ??
      readString(rawResult.publicUrl) ??
      null,
    sections: normalizedSections,
    layoutHint: readLayoutHint(rawResult.layoutHint ?? rawResult.layout_hint),
  };
}

function mapVideoResultPayload(payload: VideoResultEnvelope['data']): VideoResultData {
  return {
    taskId: payload.taskId,
    status: payload.status,
    result: normalizeResultPayload(payload),
    failure: payload.failure,
  };
}

function mapVideoResultApiClientError(error: unknown): VideoResultAdapterError {
  if (error instanceof VideoResultAdapterError) {
    return error;
  }

  if (isApiClientError(error)) {
    const payload = error.data as
      | {
          code?: number | string;
          msg?: string;
        }
      | undefined;

    return createVideoResultError(
      error.status,
      String(payload?.code ?? error.status),
      payload?.msg ?? error.message,
    );
  }

  return createVideoResultError(
    500,
    'VIDEO_RESULT_UNKNOWN',
    error instanceof Error ? error.message : '未知视频结果适配错误',
  );
}

export function createMockVideoResultAdapter(): VideoResultAdapter {
  return {
    getResult(taskId, options) {
      const scenario = inferPipelineScenario(taskId, options?.scenario);

      if (scenario === 'failure') {
        return Promise.resolve({
          taskId,
          status: 'failed',
          result: null,
          failure: getMockVideoFailure(taskId),
        });
      }

      return Promise.resolve({
        taskId,
        status: 'completed',
        result: {
          ...getMockVideoResult(taskId),
          published: false,
        },
        failure: null,
      });
    },
    getPublicResult(resultId) {
      const mockResult = normalizeMockPublicResult(resultId);

      return Promise.resolve({
        taskId: mockResult.taskId,
        status: 'completed',
        result: mockResult,
        failure: null,
      });
    },
  };
}

export function createRealVideoResultAdapter(
  { client = fastapiClient }: RealVideoResultAdapterOptions = {},
): VideoResultAdapter {
  return {
    async getResult(taskId, options) {
      try {
        const response = await client.request<VideoResultEnvelope>({
          url: `/api/v1/video/tasks/${taskId}/result`,
          method: 'get',
          signal: options?.signal,
        });

        return mapVideoResultPayload(response.data.data);
      } catch (error) {
        throw mapVideoResultApiClientError(error);
      }
    },
    async getPublicResult(resultId, options) {
      try {
        const response = await client.request<VideoResultEnvelope>({
          url: `/api/v1/video/public/${resultId}`,
          method: 'get',
          signal: options?.signal,
        });

        return mapVideoResultPayload(response.data.data);
      } catch (error) {
        throw mapVideoResultApiClientError(error);
      }
    },
  };
}

export function resolveVideoResultAdapter(
  options: ResolveVideoResultAdapterOptions = {},
): VideoResultAdapter {
  return pickAdapterImplementation(
    {
      mock: createMockVideoResultAdapter(),
      real: createRealVideoResultAdapter({
        client: options.client ?? fastapiClient,
      }),
    },
    {
      useMock: options.useMock,
    },
  );
}
