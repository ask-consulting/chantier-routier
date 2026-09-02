import { InvitationStatus } from '@chantia/shared';
import { SearchResult } from '@shared/domain/search.types';
import { Invitation } from '../entities/invitation.entity';

/** What the invitations screen may narrow its list by. */
export interface InvitationSearchParams {
  /** Always set by the controller from the caller's token, never from the request. */
  organizationId: string;
  page?: number;
  limit?: number;
  /** Free text over first name, last name and email. */
  search?: string;
  status?: InvitationStatus;
}

export interface InvitationRepositoryPort {
  findById(id: string): Promise<Invitation | null>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  /**
   * The screen's list: invitations of one organization, ordered pending first,
   * each carrying its `invitee` and its `invitedBy` — the list shows people, and
   * a second query per row to name them would be the classic N+1.
   */
  search(params: InvitationSearchParams): Promise<SearchResult<Invitation>>;
  save(invitation: Invitation): Promise<Invitation>;
  /**
   * Closes every outstanding invitation of a user by expiring it. Called before
   * issuing a new one, so re-inviting somebody invalidates the link already
   * sent — otherwise a forwarded old link would stay live alongside the new one.
   *
   * Expired rather than accepted: both make the token unusable, but only one of
   * them is true. Marking a link "accepted" that nobody ever accepted made the
   * invitations screen lie about the one thing it exists to show.
   */
  revokeOutstandingFor(userId: string, at?: Date): Promise<void>;
  /** Housekeeping: drops rows that can no longer be used. */
  deleteExpired(before?: Date): Promise<number>;
}

export const INVITATION_REPOSITORY_PORT = Symbol('InvitationRepositoryPort');
