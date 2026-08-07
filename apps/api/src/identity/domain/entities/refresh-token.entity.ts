/**
 * A single issued refresh token.
 *
 * The clear-text token never reaches this entity: only its SHA-256 hash is held
 * and stored, so a database dump cannot be replayed against the API.
 */
export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
    /** Id of the token this one was rotated into — the family audit trail. */
    public readonly replacedBy: string | null,
    public readonly userAgent: string | null,
    public readonly createdAt?: Date,
  ) {}

  static issue(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    revokedAt?: Date | null;
    replacedBy?: string | null;
    createdAt?: Date;
  }): RefreshToken {
    return new RefreshToken(
      props.id,
      props.userId,
      props.tokenHash,
      props.expiresAt,
      props.revokedAt ?? null,
      props.replacedBy ?? null,
      props.userAgent ?? null,
      props.createdAt,
    );
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /** Usable exactly once, before expiry, while not revoked. */
  isUsable(now: Date = new Date()): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  revoke(replacedBy: string | null = null, at: Date = new Date()): RefreshToken {
    return new RefreshToken(
      this.id,
      this.userId,
      this.tokenHash,
      this.expiresAt,
      this.revokedAt ?? at,
      replacedBy ?? this.replacedBy,
      this.userAgent,
      this.createdAt,
    );
  }
}
