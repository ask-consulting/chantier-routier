import { InvitationStatus } from '@chantia/shared';

/**
 * One row of the invitations screen — a *read model*, not an entity.
 *
 * `Invitation` is the aggregate: a token hash, a window, an audit trail. What a
 * screen needs is a person and where their invitation stands, which spans two
 * tables. Rather than make the entity carry fields it has no business owning,
 * or make the browser fetch users and invitations separately and join them by
 * hand, the query side has its own shape.
 *
 * It is deliberately flat and deliberately read-only: nothing here is ever
 * saved back.
 */
export interface InvitationListItem {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Derived at read time from `acceptedAt` and `expiresAt` — never stored. */
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  /** The admin who sent it. Null once that account is deleted. */
  invitedById: string | null;
  /** Their name, joined from the relation; null for the same reason. */
  invitedByName: string | null;
}
