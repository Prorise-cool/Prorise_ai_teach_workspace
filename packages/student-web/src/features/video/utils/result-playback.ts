import type { VideoResultSection } from '@/types/video';

export interface VideoPlaybackSection extends VideoResultSection {
  resolvedStartSeconds: number;
  resolvedEndSeconds: number;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function normalizeLectureLines(lines?: string[]) {
  if (!Array.isArray(lines)) {
    return null;
  }

  const normalized = lines
    .map((line) => line.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : null;
}

export function resolveSectionSubtitle(section?: VideoResultSection | null) {
  if (!section) {
    return null;
  }

  return (
    normalizeText(section.ttsText) ??
    normalizeText(section.subtitleText) ??
    normalizeText(section.narrationText) ??
    normalizeLectureLines(section.lectureLines)?.join(' ') ??
    null
  );
}

export function resolveSectionSummary(section?: VideoResultSection | null) {
  if (!section) {
    return null;
  }

  return (
    normalizeText(section.summary) ??
    resolveSectionSubtitle(section) ??
    null
  );
}

function toFiniteNumber(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampSeconds(value: number, duration: number) {
  if (duration <= 0) {
    return Math.max(0, value);
  }

  return Math.min(Math.max(0, value), duration);
}

export function buildPlaybackSections(
  sections: VideoResultSection[] | undefined,
  durationSeconds: number,
): VideoPlaybackSection[] {
  if (!sections?.length) {
    return [];
  }

  const sortedSections = [...sections].sort(
    (left, right) => left.sectionIndex - right.sectionIndex,
  );
  const segmentDuration =
    durationSeconds > 0 ? durationSeconds / sortedSections.length : 1;

  return sortedSections.map((section, index) => {
    const fallbackStart = segmentDuration * index;
    const fallbackEnd = segmentDuration * (index + 1);
    const nextSection = sortedSections[index + 1];
    const nextStart = toFiniteNumber(nextSection?.startSeconds);
    const explicitStart = toFiniteNumber(section.startSeconds);
    const explicitEnd = toFiniteNumber(section.endSeconds);
    const explicitDuration = toFiniteNumber(section.durationSeconds);
    const resolvedStart = clampSeconds(explicitStart ?? fallbackStart, durationSeconds);
    const rawResolvedEnd =
      explicitEnd ??
      (explicitDuration !== null ? resolvedStart + explicitDuration : null) ??
      nextStart ??
      fallbackEnd;
    const resolvedEnd = Math.max(
      resolvedStart + 0.01,
      clampSeconds(rawResolvedEnd, durationSeconds || rawResolvedEnd),
    );

    return {
      ...section,
      resolvedStartSeconds: resolvedStart,
      resolvedEndSeconds: resolvedEnd,
    };
  });
}

export function getActivePlaybackSection(
  sections: VideoPlaybackSection[],
  currentTimeSeconds: number,
) {
  if (!sections.length) {
    return null;
  }

  const exactMatch = sections.find(
    (section) =>
      currentTimeSeconds >= section.resolvedStartSeconds &&
      currentTimeSeconds < section.resolvedEndSeconds,
  );

  if (exactMatch) {
    return exactMatch;
  }

  return (
    [...sections]
      .reverse()
      .find((section) => currentTimeSeconds >= section.resolvedStartSeconds) ??
    sections[0]
  );
}

export function formatPlaybackTimestamp(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (clamped % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}
