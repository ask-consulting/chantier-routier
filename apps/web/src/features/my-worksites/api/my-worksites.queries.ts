'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAccounts,
  fetchAssignments,
  fetchMembers,
  fetchMyWorksite,
  fetchMyWorksites,
  fetchPlan,
  setMembers,
  updateTaskProgress,
} from './my-worksites.api';

const ROOT = ['my-worksites'] as const;
/** The planning lives in the planning feature's cache too: both must refresh. */
const PLANNING = ['planning'] as const;

export const useMyWorksites = () => useQuery({ queryKey: ROOT, queryFn: fetchMyWorksites });

export const useMyWorksite = (id: string) =>
  useQuery({ queryKey: [...ROOT, id], queryFn: () => fetchMyWorksite(id) });

export const usePlan = (worksiteId: string) =>
  useQuery({ queryKey: [...ROOT, worksiteId, 'plan'], queryFn: () => fetchPlan(worksiteId) });

export const useMembers = (worksiteId: string) =>
  useQuery({
    queryKey: [...ROOT, worksiteId, 'members'],
    queryFn: () => fetchMembers(worksiteId),
  });

export const useAccounts = (enabled: boolean) =>
  useQuery({ queryKey: [...ROOT, 'accounts'], queryFn: fetchAccounts, enabled });

export const useAssignments = (worksiteId: string, enabled: boolean) =>
  useQuery({
    queryKey: [...ROOT, worksiteId, 'equipment'],
    queryFn: () => fetchAssignments(worksiteId),
    enabled,
  });

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, progress }: { taskId: string; progress: number }) =>
      updateTaskProgress(taskId, progress),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ROOT });
      await queryClient.invalidateQueries({ queryKey: PLANNING });
    },
  });
}

export function useSetMembers(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => setMembers(worksiteId, userIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT }),
  });
}
