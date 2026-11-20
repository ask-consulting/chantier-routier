'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ICreateOwnMaterial,
  IPlanTaskMaterial,
  IUpdateOwnMaterial,
  IUpdateTaskMaterial,
} from '@chantia/shared';
import { planKey } from '@/features/planning';
import {
  createOwnMaterial,
  fetchMaterialCatalog,
  fetchOwnMaterials,
  fetchTaskMaterials,
  fetchWorksitePlan,
  planTaskMaterial,
  removeOwnMaterial,
  removeTaskMaterial,
  updateOwnMaterial,
  updateTaskMaterial,
} from './materials.api';

export const materialKeys = {
  all: ['materials'] as const,
  catalog: () => [...materialKeys.all, 'catalog'] as const,
  own: () => [...materialKeys.all, 'own'] as const,
  /** A worksite's planned needs, cached by « Mes chantiers »: they show own materials' names. */
  needs: (worksiteId?: string) =>
    worksiteId === undefined
      ? ([...materialKeys.all, 'needs'] as const)
      : ([...materialKeys.all, 'needs', worksiteId] as const),
};

/** Written only by migrations: once a session is enough. */
export const useMaterialCatalog = (enabled = true) =>
  useQuery({
    queryKey: materialKeys.catalog(),
    queryFn: fetchMaterialCatalog,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });

export const useOwnMaterials = (enabled = true) =>
  useQuery({ queryKey: materialKeys.own(), queryFn: fetchOwnMaterials, enabled });

export function useOwnMaterialChanges() {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: materialKeys.own() }),
      queryClient.invalidateQueries({ queryKey: materialKeys.needs() }),
    ]);
  return {
    create: useMutation({
      mutationFn: (data: ICreateOwnMaterial) => createOwnMaterial(data),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: IUpdateOwnMaterial }) =>
        updateOwnMaterial(id, data),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: removeOwnMaterial, onSuccess }),
  };
}

/** The planning feature's cache entry: a plan changed there shows here at once. */
export const useWorksitePlan = (worksiteId: string) =>
  useQuery({ queryKey: planKey(worksiteId), queryFn: () => fetchWorksitePlan(worksiteId) });

export const useTaskMaterials = (worksiteId: string) =>
  useQuery({
    queryKey: materialKeys.needs(worksiteId),
    queryFn: () => fetchTaskMaterials(worksiteId),
  });

/** Every change to what a task needs: they all refresh the same list. */
export function useTaskMaterialChanges(worksiteId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: materialKeys.needs(worksiteId) });
  return {
    plan: useMutation({
      mutationFn: ({ taskId, data }: { taskId: string; data: IPlanTaskMaterial }) =>
        planTaskMaterial(taskId, data),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: IUpdateTaskMaterial }) =>
        updateTaskMaterial(id, data),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: removeTaskMaterial, onSuccess }),
  };
}
