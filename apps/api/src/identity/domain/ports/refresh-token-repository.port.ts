import { RefreshToken } from '../entities/refresh-token.entity';

export interface RefreshTokenRepositoryPort {
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<RefreshToken>;
  /**
   * Revokes every live token of a user. Used on logout-everywhere, on password
   * change, and on refresh-token reuse detection.
   */
  revokeAllForUser(userId: string, at?: Date): Promise<void>;
  /** Housekeeping: drops rows that can no longer be used. */
  deleteExpired(before?: Date): Promise<number>;
}

export const REFRESH_TOKEN_REPOSITORY_PORT = Symbol('RefreshTokenRepositoryPort');
