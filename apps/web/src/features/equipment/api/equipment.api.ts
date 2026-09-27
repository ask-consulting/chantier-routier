import type {
  AcquisitionMethod,
  EquipmentStatus,
  ICreateEquipment,
  ICreateEquipmentAssignment,
  IEquipment,
  IEquipmentAssignment,
  IEquipmentCategory,
  IUpdateEquipment,
  IUpdateEquipmentAssignment,
} from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

/**
 * The equipment endpoints, and the only place they live. Plain functions, no
 * React — the hooks that cache them are in `equipment.queries.ts`.
 */

export interface EquipmentListParams {
  page?: number;
  limit?: number;
  /** Free text over designation, fleet number, brand, model, serial and plate. */
  search?: string;
  /** A category code of the catalog. */
  category?: string;
  status?: EquipmentStatus;
  acquisitionMethod?: AcquisitionMethod;
}

export function fetchEquipmentList(params?: EquipmentListParams): Promise<Paginated<IEquipment>> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.acquisitionMethod) {
    query.set('acquisitionMethod', params.acquisitionMethod);
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IEquipment>>(`/equipment${suffix}`);
}

export function createEquipment(payload: ICreateEquipment): Promise<IEquipment> {
  return apiFetch<IEquipment>('/equipment', { method: 'POST', data: payload });
}

export function updateEquipment(id: string, payload: IUpdateEquipment): Promise<IEquipment> {
  return apiFetch<IEquipment>(`/equipment/${id}`, { method: 'PATCH', data: payload });
}

/** For a machine recorded by mistake; one sold is retired, not deleted. */
export function deleteEquipment(id: string): Promise<void> {
  return apiFetch<void>(`/equipment/${id}`, { method: 'DELETE' });
}

/**
 * The catalog — categories and their types, labels in both languages. The same
 * for every organization and changed only by a deployment, so it is fetched
 * once and kept.
 */
export function fetchEquipmentCatalog(): Promise<IEquipmentCategory[]> {
  return apiFetch<IEquipmentCategory[]>('/equipment-catalog');
}

export interface AssignmentListParams {
  equipmentId?: string;
  worksiteId?: string;
}

/** A machine's planning, or what is on a worksite — chronological, all of it. */
export function fetchAssignments(params: AssignmentListParams): Promise<Paginated<IEquipmentAssignment>> {
  const query = new URLSearchParams({ limit: '100' });
  if (params.equipmentId) {
    query.set('equipmentId', params.equipmentId);
  }
  if (params.worksiteId) {
    query.set('worksiteId', params.worksiteId);
  }
  return apiFetch<Paginated<IEquipmentAssignment>>(`/equipment-assignments?${query}`);
}

export function createAssignment(payload: ICreateEquipmentAssignment): Promise<IEquipmentAssignment> {
  return apiFetch<IEquipmentAssignment>('/equipment-assignments', { method: 'POST', data: payload });
}

export function updateAssignment(
  id: string,
  payload: IUpdateEquipmentAssignment,
): Promise<IEquipmentAssignment> {
  return apiFetch<IEquipmentAssignment>(`/equipment-assignments/${id}`, {
    method: 'PATCH',
    data: payload,
  });
}

/** Cancels it — a real deletion; its cost leaves the worksite's. */
export function deleteAssignment(id: string): Promise<void> {
  return apiFetch<void>(`/equipment-assignments/${id}`, { method: 'DELETE' });
}
