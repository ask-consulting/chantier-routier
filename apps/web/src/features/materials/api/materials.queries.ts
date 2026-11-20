'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ICreateOwnMaterial, IUpdateOwnMaterial } from '@chantia/shared';
import {
  createOwnMaterial,
  fetchMaterialCatalog,
  fetchOwnMaterials,
  removeOwnMaterial,
  updateOwnMaterial,
} from './materials.api';

export const materialKeys = {
  all: ['materials'] as const,
  catalog: () => [...materialKeys.all, 'catalog'] as const,
  own: () => [...materialKeys.all, 'own'] as const,
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
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: materialKeys.own() });
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
