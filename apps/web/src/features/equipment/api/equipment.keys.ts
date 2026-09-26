import type { EquipmentListParams } from './equipment.api';

/** Every cache key this feature uses — a factory, so invalidations match. */
export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (params?: EquipmentListParams) => [...equipmentKeys.lists(), params ?? {}] as const,
};
