import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token-repository.port';
import { TOKEN_ISSUER_PORT, TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import { LogoutCommand } from './logout.command';

/**
 * Ends one session, or all of them.
 *
 * Always succeeds: an unknown, expired or foreign token still leaves the caller
 * logged out, and reporting *which* it was would let anyone probe the token
 * store. The caller's access token stays technically valid until it expires —
 * clients are expected to drop it, and the window is one access-token lifetime.
 */
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    if (!command.refreshToken) {
      await this.refreshTokens.revokeAllForUser(command.userId);
      return;
    }

    const tokenHash = this.tokenIssuer.hashRefreshToken(command.refreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);

    // Ownership is checked so one user cannot end another's session by
    // presenting a token they somehow got hold of.
    if (stored && !stored.isRevoked() && stored.userId === command.userId) {
      await this.refreshTokens.save(stored.revoke());
    }
  }
}
