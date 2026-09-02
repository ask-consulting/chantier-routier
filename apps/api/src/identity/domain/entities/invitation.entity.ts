import { User } from './user.entity';

/**
 * An invitation to join the organization.
 *
 * The clear-text token never reaches this entity: only its SHA-256 is held and
 * stored, exactly like a refresh token, so a database dump cannot be replayed.
 *
 * Single-use and time-limited. Both properties matter for a link that travels
 * through WhatsApp or SMS, where it may be forwarded, screenshotted, or left in
 * a conversation for months.
 *
 * **`invitee` and `invitedBy` are loaded on demand**, and default to `null`: the
 * write paths look an invitation up by token to accept or close it, and have no
 * use for either. The read path — the invitations screen — asks for both in the
 * same query, because it lists people rather than tokens.
 *
 * A `null` relation is therefore ambiguous on its face: not loaded, or gone?
 * The ids answer it, and the accessors below say so out loud rather than leaving
 * every caller to work it out:
 *
 *   - `userId` is never null, so `invitee === null` means *not loaded*.
 *   - `invitedById` **is** nullable — `ON DELETE SET NULL` — so a null id means
 *     the admin's account is gone, and a non-null id with a null relation means
 *     the relation was simply not asked for.
 */
export class Invitation {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly expiresAt: Date,
    public readonly acceptedAt: Date | null,
    /**
     * Who invited them. Null once that account is deleted — the invitation
     * outlives the admin who left, and the foreign key sets this to NULL rather
     * than taking the row with it.
     */
    public readonly invitedById: string | null,
    public readonly createdAt?: Date,
    /** The person invited. Null when the relation was not loaded. */
    public readonly invitee: User | null = null,
    /** The admin who invited. Null when not loaded, or when they are gone. */
    public readonly invitedBy: User | null = null,
  ) {}

  static issue(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    invitedById: string | null;
    acceptedAt?: Date | null;
    createdAt?: Date;
    invitee?: User | null;
    invitedBy?: User | null;
  }): Invitation {
    return new Invitation(
      props.id,
      props.userId,
      props.tokenHash,
      props.expiresAt,
      props.acceptedAt ?? null,
      props.invitedById,
      props.createdAt,
      props.invitee ?? null,
      props.invitedBy ?? null,
    );
  }

  /**
   * True when the admin who sent this no longer has an account.
   *
   * Told apart from "not loaded" by the id, not by the relation — which is the
   * whole reason the id stays on the entity next to the object.
   */
  hasKnownInviter(): boolean {
    return this.invitedById !== null;
  }

  isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /** Usable exactly once, before expiry. */
  isUsable(now: Date = new Date()): boolean {
    return !this.isAccepted() && !this.isExpired(now);
  }

  accept(at: Date = new Date()): Invitation {
    return new Invitation(
      this.id,
      this.userId,
      this.tokenHash,
      this.expiresAt,
      this.acceptedAt ?? at,
      this.invitedById,
      this.createdAt,
      this.invitee,
      this.invitedBy,
    );
  }
}
