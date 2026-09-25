import type { ICreateWorker, IUpdateWorker, IWorker } from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

/**
 * The worker endpoints, and the only place they live.
 *
 * Plain functions, no React — callable from a test or a script. The hooks that
 * cache and invalidate them are next door in `worker.queries.ts`.
 */

export interface WorkerListParams {
  page?: number;
  limit?: number;
  /** Free text over name and qualification — matched server-side. */
  search?: string;
  /** Still on the payroll. Absent means both. */
  active?: boolean;
}

export function fetchWorkers(params?: WorkerListParams): Promise<Paginated<IWorker>> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  // Trimmed and dropped when empty: `?search=` would otherwise reach the API as
  // a filter matching everything, and change the cache key for nothing.
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.active !== undefined) {
    query.set('active', String(params.active));
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IWorker>>(`/workers${suffix}`);
}

export function createWorker(payload: ICreateWorker): Promise<IWorker> {
  return apiFetch<IWorker>('/workers', {
    method: 'POST',
    data: payload,
  });
}

export function updateWorker(id: string, payload: IUpdateWorker): Promise<IWorker> {
  return apiFetch<IWorker>(`/workers/${id}`, {
    method: 'PATCH',
    data: payload,
  });
}

/**
 * Never a real deletion — the API sets `deletedAt` and keeps the row, so past
 * timesheets stay computable. From here it simply stops appearing anywhere.
 */
export function deleteWorker(id: string): Promise<void> {
  return apiFetch<void>(`/workers/${id}`, { method: 'DELETE' });
}
