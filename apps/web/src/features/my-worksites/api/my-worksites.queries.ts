'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IAssignTaskWorker } from '@chantia/shared';
import {
  assignTaskWorker,
  fetchActiveWorkers,
  fetchTaskTeam,
  linkTaskEquipment,
  removeTaskWorker,
  unlinkTaskEquipment,
  fetchAccounts,
  fetchAssignments,
  fetchMembers,
  fetchMyWorksite,
  fetchMyWorksites,
  fetchPlan,
  setMembers,
  updateTaskProgress,
} from './my-worksites.api';
import { equipmentKeys } from '@/features/equipment';
import { planKey } from '@/features/planning';
import { workerKeys } from '@/features/workers';

const ROOT = ['my-worksites'] as const;
/** The planning lives in the planning feature's cache too: both must refresh. */
const PLANNING = ['planning'] as const;

export const useMyWorksites = () => useQuery({ queryKey: ROOT, queryFn: fetchMyWorksites });

export const useMyWorksite = (id: string) =>
  useQuery({ queryKey: [...ROOT, id], queryFn: () => fetchMyWorksite(id) });

/** The planning feature's cache entry: a change made there shows here at once. */
export const usePlan = (worksiteId: string) =>
  useQuery({ queryKey: planKey(worksiteId), queryFn: () => fetchPlan(worksiteId) });

export const useMembers = (worksiteId: string) =>
  useQuery({
    queryKey: [...ROOT, worksiteId, 'members'],
    queryFn: () => fetchMembers(worksiteId),
  });

export const useAccounts = (enabled: boolean) =>
  useQuery({ queryKey: [...ROOT, 'accounts'], queryFn: fetchAccounts, enabled });

export const useAssignments = (worksiteId: string, enabled: boolean) =>
  useQuery({
    // Under the equipment feature's keys, so a booking made there refreshes this list.
    queryKey: [...equipmentKeys.assignments(), 'worksite', worksiteId],
    queryFn: () => fetchAssignments(worksiteId),
    enabled,
  });

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, progress }: { taskId: string; progress: number }) =>
      updateTaskProgress(taskId, progress),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ROOT }),
        queryClient.invalidateQueries({ queryKey: PLANNING }),
      ]),
  });
}

export function useSetMembers(worksiteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => setMembers(worksiteId, userIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT }),
  });
}

export const useTaskTeam = (worksiteId: string) =>
  useQuery({
    queryKey: [...ROOT, worksiteId, 'task-team'],
    queryFn: () => fetchTaskTeam(worksiteId),
  });

export const useActiveWorkers = (enabled: boolean) =>
  useQuery({ queryKey: [...workerKeys.all, 'active'], queryFn: fetchActiveWorkers, enabled });

/** Every change to who works on a task: they all refresh the same list. */
export function useTaskTeamChanges(worksiteId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: [...ROOT, worksiteId, 'task-team'] });
  return {
    assignWorker: useMutation({
      mutationFn: ({ taskId, data }: { taskId: string; data: IAssignTaskWorker }) =>
        assignTaskWorker(taskId, data),
      onSuccess,
    }),
    removeWorker: useMutation({ mutationFn: removeTaskWorker, onSuccess }),
    linkEquipment: useMutation({
      mutationFn: ({ taskId, bookingId }: { taskId: string; bookingId: string }) =>
        linkTaskEquipment(taskId, bookingId),
      onSuccess,
    }),
    unlinkEquipment: useMutation({ mutationFn: unlinkTaskEquipment, onSuccess }),
  };
}
