import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DEMO_ACCOUNT_EMAIL, DEMO_ORGANIZATION_ID } from '@chantia/shared';
import { DemoConfig } from '@config/demo.config';
import { DemoUnavailableException } from '../../domain/exceptions/identity.exceptions';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { IssuedSession, SessionIssuer } from '../services/session-issuer.service';
import { DemoLoginCommand } from './demo-login.command';

/**
 * Opens a session on the public demonstration's account, with no password:
 * what the showcase's « Essayer la démo » does.
 *
 * No password because every visitor shares the account, and a password would
 * trip the per-account limit of the login after a few visitors. Safe because
 * it can only ever be that account, in that organization, and only while
 * `DEMO_ENABLED` is set: otherwise it answers as if it did not exist.
 */
@CommandHandler(DemoLoginCommand)
export class DemoLoginHandler implements ICommandHandler<DemoLoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    private readonly sessionIssuer: SessionIssuer,
    private readonly config: ConfigService,
  ) {}

  async execute({ userAgent }: DemoLoginCommand): Promise<IssuedSession> {
    if (!this.config.getOrThrow<DemoConfig>('demo').enabled) {
      throw new DemoUnavailableException();
    }
    const user = await this.users.findByEmail(DEMO_ACCOUNT_EMAIL);
    if (!user || user.organizationId !== DEMO_ORGANIZATION_ID || !user.active) {
      throw new DemoUnavailableException();
    }
    return this.sessionIssuer.issueFor(user, { userAgent });
  }
}
