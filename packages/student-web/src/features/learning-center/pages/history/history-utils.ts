type HistoryTimeRange = '7d' | '30d' | 'all';

function safeParseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHistoryShortTime(value: string) {
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

export function getHistoryTypeLabel(recordType: string) {
  switch (recordType) {
    case 'video':
      return '单题讲解';
    case 'classroom':
      return '主题课堂';
    case 'quiz':
      return '课后测验';
    case 'checkpoint':
      return 'Checkpoint';
    case 'companion':
      return '伴学答疑';
    case 'evidence':
      return '依据溯源';
    case 'wrongbook':
      return '错题本';
    case 'path':
      return '学习路径';
    case 'recommendation':
      return '推荐';
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

export function buildHistoryTimeRange(timeRange: HistoryTimeRange) {
  if (timeRange === 'all') {
    return { begin: null, end: null };
  }

  const days = timeRange === '30d' ? 30 : 7;
  const end = new Date();
  const begin = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pad = (value: number) => String(value).padStart(2, '0');
  const format = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return {
    begin: format(begin),
    end: format(end),
  };
}

