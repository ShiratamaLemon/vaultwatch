import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectIndexEntry } from '@/types';

interface ProjectStore {
  // State
  projects: ProjectIndexEntry[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  watchedBucketIds: string[];

  // Actions
  setProjects: (projects: ProjectIndexEntry[]) => void;
  addProject: (project: ProjectIndexEntry) => void;
  updateProject: (id: string, updates: Partial<ProjectIndexEntry>) => void;
  removeProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSyncedAt: (timestamp: number) => void;
  toggleWatchlist: (bucketId: string) => void;
  reset: () => void;
}

const initialState = {
  projects: [] as ProjectIndexEntry[],
  selectedProjectId: null as string | null,
  isLoading: false,
  error: null as string | null,
  lastSyncedAt: null as number | null,
  watchedBucketIds: [] as string[],
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      ...initialState,

      setProjects: (projects) =>
        set({ projects, error: null }),

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
          error: null,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          selectedProjectId:
            state.selectedProjectId === id ? null : state.selectedProjectId,
        })),

      selectProject: (id) =>
        set({ selectedProjectId: id }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      setSyncedAt: (timestamp) =>
        set({ lastSyncedAt: timestamp }),

      toggleWatchlist: (bucketId) =>
        set((state) => ({
          watchedBucketIds: state.watchedBucketIds.includes(bucketId)
            ? state.watchedBucketIds.filter((id) => id !== bucketId)
            : [...state.watchedBucketIds, bucketId],
        })),

      reset: () =>
        set(initialState),
    }),
    {
      name: 'vaultwatch-projects',
      partialize: (state) => ({
        projects: state.projects,
        lastSyncedAt: state.lastSyncedAt,
        watchedBucketIds: state.watchedBucketIds,
      }),
    }
  )
);
