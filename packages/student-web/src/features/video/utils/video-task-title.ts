const MARKDOWN_DECORATION_RE = /[`*_]/g;

function stripMarkdownLinePrefix(line: string) {
  return line
    .replace(/^\s*>+\s?/g, '')
    .replace(/^\s*#{1,6}\s+/g, '')
    .replace(/^\s*[-*+]\s+/g, '')
    .replace(/^\s*\d+\.\s+/g, '')
    .trim();
}

export function normalizeVideoTaskTitle(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const normalizedLines = trimmed
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(stripMarkdownLinePrefix)
    .filter(Boolean);

  return normalizedLines
    .join(' ')
    .replace(MARKDOWN_DECORATION_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveVideoTaskDraftTitle(rawText: string, fallback: string, maxChars = 48) {
  const normalized = normalizeVideoTaskTitle(rawText);

  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars).trimEnd()}...`;
}

export function resolveVideoTaskTitleDisplay(rawText: string, fallback: string) {
  const normalized = normalizeVideoTaskTitle(rawText);
  const fullTitle = normalized || fallback;
  const isLong = fullTitle.length >= 54;

  return {
    displayTitle: fullTitle,
    fullTitle,
    isLong,
  };
}
