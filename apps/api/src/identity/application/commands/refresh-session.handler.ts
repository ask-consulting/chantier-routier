import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token-repository.port';
import { TOKEN_ISSUER_PORT, TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { InvalidRefreshTokenException } from '../../infrastructure/exceptions/identity.exceptions';
import { IssuedSession, SessionIssuer } from '../services/session-issuer.service';
import { RefreshSessionCommand } from './refresh-session.command';

/**
 * Rotating refresh: every refresh mints a new token and kills the old one, so a
 * stolen token is usable at most once.
 *
 * Presenting an *already rotated* token is the tell-tale of a theft — the
 * legitimate client would have moved on to the replacement. Since we cannot know
 * which of the two parties is the thief, the whole family is revoked and both
 * are forced to log in again.
 */
@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  private readonly logger = new Logger(RefreshSessionHandler.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<IssuedSession> {
    const tokenHash = this.tokenIssuer.hashRefreshToken(command.refreshToken);

    const stored = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!stored) {
      throw new InvalidRefreshTokenException();
    }

    if (stored.isRevoked()) {
      this.logger.warn(
        `Reuse of a revoked refresh token for user ${stored.userId} — revoking every session`,
      );
      await this.refreshTokens.revokeAllForUser(stored.userId);
      throw new InvalidRefreshTokenException();
    }

    if (stored.isExpired()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.users.findById(stored.userId);
    if (!user?.canAuthenticate()) {
      // The account was deleted or deactivated while the session was alive.
      await this.refreshTokens.revokeAllForUser(stored.userId);
      throw new InvalidRefreshTokenException();
    }

    return this.sessionIssuer.issueFor(user, {
      userAgent: command.userAgent,
      rotating: stored,
    });
  }
}
