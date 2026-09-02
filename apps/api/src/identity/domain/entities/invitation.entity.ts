/**
 * An invitation to join the organization.
 *
 * The clear-text token never reaches this entity: only its SHA-256 is held and
 * stored, exactly like a refresh token, so a database dump cannot be replayed.
 *
 * Single-use and time-limited. Both properties matter for a link that travels
 * through WhatsApp or SMS, where it may be forwarded, screenshotted, or left in
 * a conversation for months.
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
  ) {}

  static issue(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    invitedById: string | null;
    acceptedAt?: Date | null;
    createdAt?: Date;
  }): Invitation {
    return new Invitation(
      props.id,
      props.userId,
      props.tokenHash,
      props.expiresAt,
      props.acceptedAt ?? null,
      props.invitedById,
      props.createdAt,
    );
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
    );
  }
}
