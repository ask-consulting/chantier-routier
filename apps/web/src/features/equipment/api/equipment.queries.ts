'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUpdateEquipment, IUpdateEquipmentAssignment } from '@chantia/shared';
import {
  createAssignment,
  createEquipment,
  deleteAssignment,
  deleteEquipment,
  fetchAssignments,
  fetchEquipmentCatalog,
  fetchEquipmentList,
  updateAssignment,
  updateEquipment,
  type AssignmentListParams,
  type EquipmentListParams,
} from './equipment.api';
import { equipmentKeys } from './equipment.keys';

/**
 * The React-facing side of the equipment endpoints; every write owns its
 * invalidation.
 *
 * An assignment's write also invalidates `['worksites']`: it changes the
 * worksite's cost. The literal rather than `worksiteKeys` — a feature does not
 * reach into another's private files.
 */

const WORKSITES_KEY = ['worksites'] as const;

export function useEquipmentList(params?: EquipmentListParams) {
  return useQuery({
    queryKey: equipmentKeys.list(params),
    queryFn: () => fetchEquipmentList(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateEquipment }) => updateEquipment(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

/** Fetched once per session: it changes only with a deployment. */
export function useEquipmentCatalog() {
  return useQuery({
    queryKey: equipmentKeys.catalog(),
    queryFn: fetchEquipmentCatalog,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useAssignments(params: AssignmentListParams) {
  return useQuery({
    queryKey: equipmentKeys.assignmentList(params),
    queryFn: () => fetchAssignments(params),
  });
}

function useAssignmentInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: equipmentKeys.assignments() }),
      queryClient.invalidateQueries({ queryKey: WORKSITES_KEY }),
    ]);
}

export function useCreateAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({ mutationFn: createAssignment, onSuccess: invalidate });
}

export function useUpdateAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateEquipmentAssignment }) =>
      updateAssignment(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({ mutationFn: deleteAssignment, onSuccess: invalidate });
}
