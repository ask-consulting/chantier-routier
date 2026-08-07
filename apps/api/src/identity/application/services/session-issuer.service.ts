import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { User } from '../../domain/entities/user.entity';
import {
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token-repository.port';
import { TOKEN_ISSUER_PORT, TokenIssuerPort } from '../../domain/ports/token-issuer.port';

/** What register, login and refresh all return. */
export interface IssuedSession {
  user: User;
  accessToken: string;
  /** Clear-text refresh token — handed to the client, never stored as-is. */
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

/**
 * The one place a session comes into existence.
 *
 * Register, login and refresh differ entirely in *how they authenticate* and not
 * at all in *what they hand back*; keeping the minting here means the token
 * lifetime, the claim set and the rotation bookkeeping have a single definition
 * instead of three copies drifting apart.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async issueFor(
    user: User,
    options: {
      userAgent?: string | null;
      /** The token being rotated out, on a refresh. Revoked once the new one exists. */
      rotating?: RefreshToken;
    } = {},
  ): Promise<IssuedSession> {
    const accessToken = await this.tokenIssuer.issueAccessToken({
      sub: user.id,
      org: user.organizationId,
      role: user.role,
      email: user.email,
    });

    const refreshToken = this.tokenIssuer.issueRefreshToken();
    const stored = await this.refreshTokens.save(
      RefreshToken.issue({
        id: randomUUID(),
        userId: user.id,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
        userAgent: options.userAgent ?? null,
      }),
    );

    // Revoked only after the replacement is persisted: if this write fails the
    // client still holds a working token, which is far better than a client
    // stranded with two dead ones.
    if (options.rotating) {
      await this.refreshTokens.save(options.rotating.revoke(stored.id));
    }

    return {
      user,
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresIn: accessToken.expiresIn,
    };
  }
}
