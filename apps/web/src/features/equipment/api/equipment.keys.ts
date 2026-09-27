import type { AssignmentListParams, EquipmentListParams } from './equipment.api';

/** Every cache key this feature uses — a factory, so invalidations match. */
export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (params?: EquipmentListParams) => [...equipmentKeys.lists(), params ?? {}] as const,
  catalog: () => [...equipmentKeys.all, 'catalog'] as const,
  assignments: () => [...equipmentKeys.all, 'assignments'] as const,
  assignmentList: (params: AssignmentListParams) =>
    [...equipmentKeys.assignments(), params] as const,
};
