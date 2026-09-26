'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUpdateEquipment } from '@chantia/shared';
import {
  createEquipment,
  deleteEquipment,
  fetchEquipmentList,
  updateEquipment,
  type EquipmentListParams,
} from './equipment.api';
import { equipmentKeys } from './equipment.keys';

/** The React-facing side of the equipment endpoints; every write owns its invalidation. */

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
