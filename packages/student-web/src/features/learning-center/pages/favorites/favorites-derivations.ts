import type { LearningCenterRecord, LearningCenterFavoriteFolder } from '@/types/learning-center';

import { safeParseDate } from './favorites-utils';

export type FavoritesFolderOption = {
  folderId: string;
  name: string;
};

export function buildFavoritesFolderOptions({
  builtin,
  storedFolders,
}: {
  builtin: FavoritesFolderOption[];
  storedFolders: LearningCenterFavoriteFolder[];
}) {
  return [
    ...builtin,
    ...storedFolders.map((folder) => ({ folderId: folder.folderId, name: folder.folderName })),
  ];
}

export function buildFolderNameById(folderOptions: FavoritesFolderOption[]) {
  const map = new Map<string, string>();
  folderOptions.forEach((folder) => {
    map.set(folder.folderId, folder.name);
  });
  return map;
}

export function buildFolderCounts(records: LearningCenterRecord[], assignments: Record<string, string>) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const folderId = assignments[record.recordId];
    if (!folderId) return;
    counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
  });
  return counts;
}

export function buildFilteredRecords({
  records,
  assignments,
  activeType,
  activeFolderId,
  sortOrder,
}: {
  records: LearningCenterRecord[];
  assignments: Record<string, string>;
  activeType: string | null;
  activeFolderId: 'all' | string;
  sortOrder: 'recent' | 'asc';
}) {
  let filtered = records;

  if (activeType) {
    filtered = filtered.filter((record) => record.resultType === activeType);
  }

  if (activeFolderId !== 'all') {
    filtered = filtered.filter((record) => assignments[record.recordId] === activeFolderId);
  }

  const resolved = [...filtered];
  resolved.sort((a, b) => {
    const aTime = safeParseDate(a.favoriteTime ?? a.sourceTime)?.getTime() ?? 0;
    const bTime = safeParseDate(b.favoriteTime ?? b.sourceTime)?.getTime() ?? 0;
    return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
  });

  return resolved;
}

export function buildFavoritesTitle({
  activeFolderId,
  folderNameById,
  fallbackTitle,
}: {
  activeFolderId: 'all' | string;
  folderNameById: Map<string, string>;
  fallbackTitle: string;
}) {
  if (activeFolderId === 'all') return fallbackTitle;
  return folderNameById.get(activeFolderId) ?? fallbackTitle;
}

