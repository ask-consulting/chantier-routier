import type { ClientType, IClient, ICreateClient, IUpdateClient } from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

/**
 * The client endpoints, and the only place they live. Plain functions, no
 * React — the hooks that cache them are in `client.queries.ts`.
 */

export interface ClientListParams {
  page?: number;
  limit?: number;
  /** Free text over the name and the billing city — matched server-side. */
  search?: string;
  /** Absent means both types. */
  type?: ClientType;
  /** Every client in one page — what a picker needs, not what a list does. */
  paginated?: false;
}

export function fetchClients(params?: ClientListParams): Promise<Paginated<IClient>> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set('page', String(params.page));
  }
  if (params?.limit) {
    query.set('limit', String(params.limit));
  }
  // Trimmed and dropped when empty, for the reason `worker.api.ts` gives.
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.type) {
    query.set('type', params.type);
  }
  if (params?.paginated === false) {
    query.set('paginated', 'false');
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IClient>>(`/clients${suffix}`);
}

export function createClient(payload: ICreateClient): Promise<IClient> {
  return apiFetch<IClient>('/clients', { method: 'POST', data: payload });
}

/** `contacts`, when sent, is the whole new list — see `IUpdateClient`. */
export function updateClient(id: string, payload: IUpdateClient): Promise<IClient> {
  return apiFetch<IClient>(`/clients/${id}`, { method: 'PATCH', data: payload });
}

/**
 * Never a real deletion — the API sets `deletedAt`. Refused (409) while a
 * current worksite still points at the client.
 */
export function deleteClient(id: string): Promise<void> {
  return apiFetch<void>(`/clients/${id}`, { method: 'DELETE' });
}
