import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ChangePasswordHandler } from './application/commands/change-password.handler';
import { AcceptInvitationHandler } from './application/commands/accept-invitation.handler';
import { InviteUserHandler } from './application/commands/invite-user.handler';
import { UpdatePreferencesHandler } from './application/commands/update-preferences.handler';
import { DeleteUserHandler } from './application/commands/delete-user.handler';
import { LoginHandler } from './application/commands/login.handler';
import { LogoutHandler } from './application/commands/logout.handler';
import { RefreshSessionHandler } from './application/commands/refresh-session.handler';
import { RegisterHandler } from './application/commands/register.handler';
import { UpdateUserHandler } from './application/commands/update-user.handler';
import { GetInvitationHandler } from './application/queries/get-invitation.handler';
import { GetUserByIdHandler } from './application/queries/get-user-by-id.handler';
import { GetUsersHandler } from './application/queries/get-users.handler';
import { SessionIssuer } from './application/services/session-issuer.service';
import identityConfig from './config/identity.config';
import { INVITATION_REPOSITORY_PORT } from './domain/ports/invitation-repository.port';
import { ORGANIZATION_REPOSITORY_PORT } from './domain/ports/organization-repository.port';
import { PASSWORD_HASHER_PORT } from './domain/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY_PORT } from './domain/ports/refresh-token-repository.port';
import { TOKEN_ISSUER_PORT } from './domain/ports/token-issuer.port';
import { USER_REPOSITORY_PORT } from './domain/ports/user-repository.port';
import { IdentityPrismaService } from './infrastructure/persistence/identity-prisma.service';
import { InvitationRepository } from './infrastructure/repositories/invitation.repository';
import { OrganizationRepository } from './infrastructure/repositories/organization.repository';
import { RefreshTokenRepository } from './infrastructure/repositories/refresh-token.repository';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';
import { AuthController } from './presentation/controllers/auth.controller';
import { UserController } from './presentation/controllers/user.controller';

const CommandHandlers = [
  RegisterHandler,
  LoginHandler,
  RefreshSessionHandler,
  LogoutHandler,
  ChangePasswordHandler,
  InviteUserHandler,
  AcceptInvitationHandler,
  UpdatePreferencesHandler,
  UpdateUserHandler,
  DeleteUserHandler,
];

const QueryHandlers = [GetUsersHandler, GetUserByIdHandler, GetInvitationHandler];

const Adapters = [
  { provide: USER_REPOSITORY_PORT, useClass: UserRepository },
  { provide: ORGANIZATION_REPOSITORY_PORT, useClass: OrganizationRepository },
  { provide: REFRESH_TOKEN_REPOSITORY_PORT, useClass: RefreshTokenRepository },
  { provide: INVITATION_REPOSITORY_PORT, useClass: InvitationRepository },
  { provide: PASSWORD_HASHER_PORT, useClass: ScryptPasswordHasher },
  { provide: TOKEN_ISSUER_PORT, useClass: JwtTokenIssuer },
];

/**
 * The Identity bounded context: tenants, accounts, sessions.
 *
 * It sits outside `src/app/` — the business modules — because it is meant to be
 * liftable into its own service: it owns its config (`identity.config`), its
 * database facade (`IdentityPrismaService`, three tables) and its own Postgres
 * schema. Business code never imports from here; all it ever sees of a caller is
 * the claim set inside a verified access token.
 *
 * Nothing is exported: every dependency on identity goes through HTTP, exactly
 * as it would across a network boundary.
 */
@Module({
  imports: [ConfigModule.forFeature(identityConfig), CqrsModule, JwtModule.register({})],
  controllers: [AuthController, UserController],
  providers: [
    IdentityPrismaService,
    SessionIssuer,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Adapters,
  ],
})
export class IdentityModule {}
