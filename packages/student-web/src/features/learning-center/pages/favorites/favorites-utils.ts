type MaybeDate = Date | null;

export function safeParseDate(value: string): MaybeDate {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatFavoriteTimeLabel(value: string) {
  const date = safeParseDate(value);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return '今天收藏';
  if (diffDays === 1) return '昨天收藏';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}天前收藏`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function getTypeLabel(recordType: string) {
  switch (recordType) {
    case 'video':
      return '单题讲解';
    case 'classroom':
      return '主题课堂';
    case 'companion':
      return '伴学答疑';
    case 'quiz':
      return '测验';
    case 'evidence':
      return '依据溯源';
    default:
      return recordType;
  }
}

