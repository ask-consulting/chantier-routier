'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUpdateWorker } from '@chantia/shared';
import {
  createWorker,
  deleteWorker,
  fetchWorkers,
  updateWorker,
  type WorkerListParams,
} from './worker.api';
import { workerKeys } from './worker.keys';

/**
 * The React-facing side of the worker endpoints.
 *
 * **Every write goes through a mutation defined here, and that mutation owns
 * its invalidation.** All three touch the list — a create adds a row, an edit
 * can rename or deactivate one, a delete removes one from view — so all three
 * invalidate `workerKeys.all`.
 *
 * `placeholderData` keeps the previous page on screen while a filter is
 * applied, so typing a name does not blink the table away between keystrokes.
 */

export function useWorkers(params?: WorkerListParams) {
  return useQuery({
    queryKey: workerKeys.list(params),
    queryFn: () => fetchWorkers(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorker,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workerKeys.all }),
  });
}

export function useUpdateWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateWorker }) => updateWorker(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workerKeys.all }),
  });
}

export function useDeleteWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workerKeys.all }),
  });
}
