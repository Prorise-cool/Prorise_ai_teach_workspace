/**
 * 文件说明：收藏页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：15-收藏页/01-favorites.html
 */
import { useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveLearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

import { FavoritesCreateFolderDialog } from './favorites-create-folder-dialog';
import { FavoritesHeader } from './favorites-header';
import { FavoritesLayout } from './favorites-layout';
import { FavoritesMoveDialog } from './favorites-move-dialog';
import { FavoritesRecordGrid } from './favorites-record-grid';
import { FavoritesSidebar } from './favorites-sidebar';
import {
  buildFavoritesFolderOptions,
  buildFavoritesTitle,
  buildFilteredRecords,
  buildFolderCounts,
  buildFolderNameById,
} from './favorites-derivations';
import { useFavoritesPageData } from '@/features/learning-center/hooks/use-favorites-page-data';

const BUILTIN_FOLDER_SAMPLE_1 = 'builtin-folder:sample-1';
const BUILTIN_FOLDER_SAMPLE_2 = 'builtin-folder:sample-2';

export function FavoritesPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const adapter = useMemo(() => resolveLearningCenterAdapter(), []);

  const [activeFolderId, setActiveFolderId] = useState<'all' | string>('all');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'recent' | 'asc'>('recent');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState<LearningCenterRecord | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string>('');

  const avatarUrl = session?.user.avatarUrl ?? null;

  const userId = session?.user.id ?? null;

  const {
    viewStatus,
    records,
    total,
    folderState,
    setRecords,
    setTotal,
    setFolderState,
  } = useFavoritesPageData({
    userId,
    adapter,
    activeType,
    notify,
    t,
  });

  const storedFolders = folderState.folders;
  const assignments = folderState.assignments;

  const builtinFolderOptions = useMemo(
    () => [
      { folderId: BUILTIN_FOLDER_SAMPLE_1, name: t('learningCenter.favorites.folderSample1') },
      { folderId: BUILTIN_FOLDER_SAMPLE_2, name: t('learningCenter.favorites.folderSample2') },
    ],
    [t],
  );

  const folderOptions = useMemo(
    () =>
      buildFavoritesFolderOptions({
        builtin: builtinFolderOptions,
        storedFolders,
      }),
    [builtinFolderOptions, storedFolders],
  );

  const folderNameById = useMemo(() => buildFolderNameById(folderOptions), [folderOptions]);

  const folderCounts = useMemo(() => buildFolderCounts(records, assignments), [assignments, records]);

  const filteredRecords = useMemo(
    () =>
      buildFilteredRecords({
        records,
        assignments,
        activeType,
        activeFolderId,
        sortOrder,
      }),
    [activeFolderId, activeType, assignments, records, sortOrder],
  );

  const title = useMemo(
    () =>
      buildFavoritesTitle({
        activeFolderId,
        folderNameById,
        fallbackTitle: t('learningCenter.favorites.title'),
      }),
    [activeFolderId, folderNameById, t],
  );

  const cancelFavorite = async (record: LearningCenterRecord) => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      await adapter.cancelFavorite({
        userId,
        sourceTable: record.sourceTable,
        sourceResultId: record.sourceResultId,
      });
      setRecords((current) => current.filter((item) => item.recordId !== record.recordId));
      setTotal((current) => Math.max(0, current - 1));
      notify({
        tone: 'success',
        title: t('learningCenter.feedback.actionSuccessTitle'),
        description: t('learningCenter.feedback.actionSuccessMessage'),
      });
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('learningCenter.feedback.actionFailedTitle'),
        description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
      });
    }
  };

  const openMoveDialog = (record: LearningCenterRecord) => {
    setMoveTarget(record);
    setMoveFolderId(assignments[record.recordId] ?? '');
  };

  const closeMoveDialog = () => {
    setMoveTarget(null);
    setMoveFolderId('');
  };

  const confirmMove = () => {
    const userId = session?.user.id;
    if (!userId || !moveTarget) return;

    void (async () => {
      try {
        await adapter.assignFavoriteFolder({
          userId,
          recordId: moveTarget.recordId,
          folderId: moveFolderId || null,
        });
        setFolderState((current) => {
          const nextAssignments = { ...current.assignments };
          if (moveFolderId) {
            nextAssignments[moveTarget.recordId] = moveFolderId;
          } else {
            delete nextAssignments[moveTarget.recordId];
          }
          return {
            ...current,
            assignments: nextAssignments,
          };
        });
        closeMoveDialog();
        notify({
          tone: 'success',
          title: t('learningCenter.feedback.actionSuccessTitle'),
          description: t('learningCenter.favorites.moveSuccess'),
        });
      } catch (error: unknown) {
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.actionFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
        });
      }
    })();
  };

  const confirmCreateFolder = () => {
    const userId = session?.user.id;
    if (!userId) return;

    void (async () => {
      try {
        const created = await adapter.createFavoriteFolder({
          userId,
          folderName: newFolderName,
        });
        setFolderState((current) => ({
          ...current,
          folders: [...current.folders, created],
        }));
        setNewFolderName('');
        setCreateFolderOpen(false);
        notify({
          tone: 'success',
          title: t('learningCenter.feedback.actionSuccessTitle'),
          description: t('learningCenter.favorites.folderCreateSuccess'),
        });
      } catch (error: unknown) {
        notify({
          tone: 'error',
          title: t('learningCenter.favorites.folderCreateFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.favorites.folderCreateFailedMessage'),
        });
      }
    })();
  };

  const resolveDetailTo = (record: LearningCenterRecord) => {
    if (record.detailRef?.startsWith('/')) {
      return record.detailRef;
    }

    if (record.resultType === 'video') {
      const target = record.detailRef || record.sourceResultId;
      return `/video/${encodeURIComponent(target)}`;
    }

    if (record.resultType === 'classroom') {
      const target = record.detailRef || record.sourceResultId;
      return target ? `/classroom/play/${encodeURIComponent(target)}` : '/classroom/input';
    }

    return '/history';
  };

  if (viewStatus === 'permission-denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-text-primary dark:text-text-primary-dark">
        <p className="text-sm font-bold">{t('learningCenter.feedback.permissionDenied')}</p>
      </div>
    );
  }

  return (
    <FavoritesLayout
      sidebar={
        <FavoritesSidebar
          activeFolderId={activeFolderId}
          total={total}
          folderOptions={folderOptions}
          folderCounts={folderCounts}
          onSelectFolder={setActiveFolderId}
          onOpenCreateFolder={() => setCreateFolderOpen(true)}
        />
      }
      content={
        <div className="flex flex-col gap-6 view-enter stagger-2 relative">
          <FavoritesHeader
            title={title}
            activeType={activeType}
            sortOrder={sortOrder}
            onSelectType={setActiveType}
            onSelectSortOrder={setSortOrder}
          />

          <FavoritesRecordGrid
            viewStatus={viewStatus}
            records={filteredRecords}
            resolveDetailTo={resolveDetailTo}
            assignments={assignments}
            folderNameById={folderNameById}
            onOpenMoveDialog={openMoveDialog}
            onCancelFavorite={cancelFavorite}
          />
        </div>
      }
      dialogs={
        <>
          <FavoritesCreateFolderDialog
            open={createFolderOpen}
            onOpenChange={setCreateFolderOpen}
            newFolderName={newFolderName}
            onFolderNameChange={setNewFolderName}
            onConfirm={confirmCreateFolder}
          />

          <FavoritesMoveDialog
            moveTarget={moveTarget}
            folderOptions={folderOptions}
            selectedFolderId={moveFolderId}
            onSelectedFolderIdChange={setMoveFolderId}
            onClose={closeMoveDialog}
            onConfirm={confirmMove}
          />
        </>
      }
    />
  );
}
