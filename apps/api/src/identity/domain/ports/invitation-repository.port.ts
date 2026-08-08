import { Invitation } from '../entities/invitation.entity';

export interface InvitationRepositoryPort {
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<Invitation>;
  /**
   * Cancels every outstanding invitation of a user. Called before issuing a new
   * one, so re-inviting somebody invalidates the link already sent — otherwise a
   * forwarded old link would stay live alongside the new one.
   */
  revokeOutstandingFor(userId: string, at?: Date): Promise<void>;
  /** Housekeeping: drops rows that can no longer be used. */
  deleteExpired(before?: Date): Promise<number>;
}

export const INVITATION_REPOSITORY_PORT = Symbol('InvitationRepositoryPort');
