import type {
  AcquisitionMethod,
  EquipmentCategory,
  EquipmentStatus,
  ICreateEquipment,
  IEquipment,
  IUpdateEquipment,
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
  category?: EquipmentCategory;
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
