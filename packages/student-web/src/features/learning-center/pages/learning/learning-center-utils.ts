function safeParseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortTime(value: string) {
  const date = safeParseDate(value);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (diffDays === 0) return `今天 ${hh}:${mm}`;
  if (diffDays === 1) return `昨天 ${hh}:${mm}`;
  if (diffDays > 1 && diffDays < 7) return `${diffDays}天前`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function getRecordTypeLabel(recordType: string) {
  switch (recordType) {
    case 'video':
      return '单题讲解';
    case 'classroom':
      return '主题课堂';
    case 'companion':
      return '伴学答疑';
    case 'evidence':
      return 'Evidence';
    case 'checkpoint':
      return 'Checkpoint';
    case 'quiz':
      return 'Quiz';
    case 'path':
      return 'Path';
    case 'recommendation':
      return 'Recommendation';
    case 'wrongbook':
      return '错题本';
    default:
      return recordType;
  }
}

export function extractFirstNumber(value: string) {
  const match = value.match(/(\d{1,3})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeParseSourceTime(value: string) {
  return safeParseDate(value);
}
