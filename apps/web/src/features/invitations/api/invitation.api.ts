import type { ICreateUser, IInvitation, IInvitationListItem, InvitationStatus } from '@chantia/shared';
import { apiFetch, type Paginated } from '@/shared/api/http-client';

/**
 * The invitation endpoints, and the only place they live.
 *
 * Plain functions, no React — callable from a test or a script. The hooks that
 * cache and invalidate them are next door in `invitation.queries.ts`.
 */

export interface InvitationListParams {
  page?: number;
  limit?: number;
  /** Free text over first name, last name and email — matched server-side. */
  search?: string;
  status?: InvitationStatus;
}

/** What a resend hands back: a new link, shown once, and its new deadline. */
export interface ResentInvitation {
  invitationPath: string;
  expiresAt: string;
}

/**
 * Inviting somebody is `POST /users`, not `POST /invitations`.
 *
 * The call creates the account *and* issues the link — inviting a person is how
 * an account comes into existence in this product, and there is no step where
 * one exists without the other. The endpoint lives here rather than in a
 * `users` feature because this screen is its only caller today; it moves the
 * day an accounts screen needs it, and the move is one import.
 */
export function createInvitation(payload: ICreateUser): Promise<IInvitation> {
  return apiFetch<IInvitation>('/users', {
    method: 'POST',
    data: payload,
  });
}

export function fetchInvitations(
  params?: InvitationListParams,
): Promise<Paginated<IInvitationListItem>> {
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
  if (params?.status) {
    query.set('status', params.status);
  }
  const suffix = query.size > 0 ? `?${query}` : '';
  return apiFetch<Paginated<IInvitationListItem>>(`/invitations${suffix}`);
}

export function resendInvitation(id: string): Promise<ResentInvitation> {
  return apiFetch<ResentInvitation>(`/invitations/${id}/resend`, { method: 'POST' });
}

export function cancelInvitation(id: string): Promise<void> {
  return apiFetch<void>(`/invitations/${id}`, { method: 'DELETE' });
}
