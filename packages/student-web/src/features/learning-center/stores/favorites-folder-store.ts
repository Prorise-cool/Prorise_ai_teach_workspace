/**
 * 文件说明：收藏页文件夹（本地归档）存储（Epic 9）。
 *
 * 说明：
 * - 后端当前仅承接收藏 / 取消收藏（xm_learning_favorite），不承接文件夹。
 * - 文件夹与移动仅用于前端个人整理（localStorage 持久化）。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const FAVORITES_FOLDER_STORAGE_KEY = 'xiaomai-favorites-folders';

export type FavoriteFolder = {
  folderId: string;
  name: string;
  createdAt: string;
};

type FavoritesFolderStoreState = {
  foldersByUserId: Record<string, FavoriteFolder[]>;
  assignmentsByUserId: Record<string, Record<string, string>>;
  createFolder: (userId: string, name: string) => FavoriteFolder | null;
  setAssignment: (userId: string, recordId: string, folderId: string | null) => void;
  removeFolder: (userId: string, folderId: string) => void;
  clearUser: (userId: string) => void;
};

const INITIAL_STATE = {
  foldersByUserId: {},
  assignmentsByUserId: {},
} satisfies Pick<FavoritesFolderStoreState, 'foldersByUserId' | 'assignmentsByUserId'>;

function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function createFolderId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `fld_${crypto.randomUUID()}`;
  }

  return `fld_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export const useFavoritesFolderStore = create<FavoritesFolderStoreState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      createFolder: (userId, name) => {
        const normalized = normalizeFolderName(name);
        if (!normalized) return null;

        const currentFolders = get().foldersByUserId[userId] ?? [];
        const alreadyExists = currentFolders.some(
          (folder) => folder.name.localeCompare(normalized, undefined, { sensitivity: 'accent' }) === 0,
        );
        if (alreadyExists) return null;

        const nextFolder: FavoriteFolder = {
          folderId: createFolderId(),
          name: normalized,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          foldersByUserId: {
            ...state.foldersByUserId,
            [userId]: [...(state.foldersByUserId[userId] ?? []), nextFolder],
          },
        }));

        return nextFolder;
      },
      setAssignment: (userId, recordId, folderId) => {
        set((state) => {
          const currentAssignments = state.assignmentsByUserId[userId] ?? {};
          const nextAssignments = { ...currentAssignments };

          if (!folderId) {
            delete nextAssignments[recordId];
          } else {
            nextAssignments[recordId] = folderId;
          }

          return {
            assignmentsByUserId: {
              ...state.assignmentsByUserId,
              [userId]: nextAssignments,
            },
          };
        });
      },
      removeFolder: (userId, folderId) => {
        set((state) => {
          const currentFolders = state.foldersByUserId[userId] ?? [];
          const currentAssignments = state.assignmentsByUserId[userId] ?? {};

          const nextFolders = currentFolders.filter((folder) => folder.folderId !== folderId);
          const nextAssignments = Object.fromEntries(
            Object.entries(currentAssignments).filter(([, assignedFolderId]) => assignedFolderId !== folderId),
          );

          return {
            foldersByUserId: {
              ...state.foldersByUserId,
              [userId]: nextFolders,
            },
            assignmentsByUserId: {
              ...state.assignmentsByUserId,
              [userId]: nextAssignments,
            },
          };
        });
      },
      clearUser: (userId) => {
        set((state) => {
          const nextFoldersByUserId = { ...state.foldersByUserId };
          const nextAssignmentsByUserId = { ...state.assignmentsByUserId };
          delete nextFoldersByUserId[userId];
          delete nextAssignmentsByUserId[userId];
          return {
            foldersByUserId: nextFoldersByUserId,
            assignmentsByUserId: nextAssignmentsByUserId,
          };
        });
      },
    }),
    {
      name: FAVORITES_FOLDER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        foldersByUserId: state.foldersByUserId,
        assignmentsByUserId: state.assignmentsByUserId,
      }),
    },
  ),
);

export function resetFavoritesFolderStore() {
  useFavoritesFolderStore.setState(INITIAL_STATE);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(FAVORITES_FOLDER_STORAGE_KEY);
  }
}

