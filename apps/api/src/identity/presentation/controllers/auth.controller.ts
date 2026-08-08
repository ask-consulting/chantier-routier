import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser, Public } from '@shared/auth';
import { AcceptInvitationCommand } from '../../application/commands/accept-invitation.command';
import { ChangePasswordCommand } from '../../application/commands/change-password.command';
import { UpdatePreferencesCommand } from '../../application/commands/update-preferences.command';
import { GetInvitationQuery } from '../../application/queries/get-invitation.query';
import { LoginCommand } from '../../application/commands/login.command';
import { LogoutCommand } from '../../application/commands/logout.command';
import { RefreshSessionCommand } from '../../application/commands/refresh-session.command';
import { RegisterCommand } from '../../application/commands/register.command';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { IssuedSession } from '../../application/services/session-issuer.service';
import { User } from '../../domain/entities/user.entity';
import { FreshAccountGuard } from '../guards/fresh-account.guard';
import type { IInvitationPreview } from '@chantia/shared';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { InvitationPreviewDto } from '../dto/invitation-response.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { RefreshSessionDto } from '../dto/refresh-session.dto';
import { RegisterDto } from '../dto/register.dto';
import { CurrentUserResponseDto } from '../dto/user-response.dto';

/**
 * Session lifecycle. The three token-minting routes are `@Public()` — they are
 * how a caller obtains the credential every other route demands.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create an organization with its first admin, and sign in',
    description:
      'Closed by default — the product serves a single organization. Answers 404 unless ' +
      'ALLOW_SELF_REGISTRATION=true. Accounts are created by invitation instead.',
  })
  @ApiResponse({ status: 201, type: AuthSessionResponseDto })
  @ApiResponse({ status: 409, description: 'Email already used' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute<RegisterCommand, IssuedSession>(
      new RegisterCommand(dto, userAgent ?? null),
    );
    return AuthSessionResponseDto.fromIssuedSession(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a session' })
  @ApiResponse({ status: 200, type: AuthSessionResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Account deactivated' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute<LoginCommand, IssuedSession>(
      new LoginCommand(dto, userAgent ?? null),
    );
    return AuthSessionResponseDto.fromIssuedSession(session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token into a new session',
    description:
      'The presented token is revoked and replaced. Store the new refresh token: ' +
      'presenting the old one again is treated as a theft and kills every session.',
  })
  @ApiResponse({ status: 200, type: AuthSessionResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid, expired or already-rotated token' })
  async refresh(
    @Body() dto: RefreshSessionDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute<RefreshSessionCommand, IssuedSession>(
      new RefreshSessionCommand(dto.refreshToken, userAgent ?? null),
    );
    return AuthSessionResponseDto.fromIssuedSession(session);
  }

  @Public()
  @Get('invitation/:token')
  @ApiOperation({
    summary: 'What the invitation page shows before asking for a password',
    description: 'Public: the token is the credential. Returns only the invitee’s own details.',
  })
  @ApiResponse({ status: 200, type: InvitationPreviewDto })
  @ApiResponse({ status: 401, description: 'Unknown, already used or expired' })
  async invitation(@Param('token') token: string): Promise<InvitationPreviewDto> {
    return this.queryBus.execute<GetInvitationQuery, IInvitationPreview>(
      new GetInvitationQuery(token),
    );
  }

  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a password from an invitation link, and sign in',
    description:
      'Signs the person in straight away: somebody who has just chosen a password should ' +
      'not be asked to type it again.',
  })
  @ApiResponse({ status: 200, type: AuthSessionResponseDto })
  @ApiResponse({ status: 401, description: 'Unknown, already used or expired' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute<AcceptInvitationCommand, IssuedSession>(
      new AcceptInvitationCommand(dto.token, dto.password, userAgent ?? null),
    );
    return AuthSessionResponseDto.fromIssuedSession(session);
  }

  @Patch('preferences')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change your own interface language',
    description: 'Stored on the account, so it follows you from the desktop to the phone.',
  })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<CurrentUserResponseDto> {
    const user = await this.commandBus.execute<UpdatePreferencesCommand, User>(
      new UpdatePreferencesCommand(userId, dto.locale),
    );
    return CurrentUserResponseDto.fromDomain(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End the given session, or all of them when no token is sent' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(userId, dto.refreshToken ?? null));
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  // The only route here that changes a credential. Logout and preferences are
  // harmless on a deactivated account, and the rest are public.
  @UseGuards(FreshAccountGuard)
  @ApiOperation({
    summary: 'Change your own password',
    description: 'Every session is revoked, including the current one: sign in again after this.',
  })
  @ApiResponse({ status: 204, description: 'Password changed, sessions revoked' })
  @ApiResponse({ status: 401, description: 'Current password does not match' })
  @ApiResponse({ status: 403, description: 'Account deactivated' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.commandBus.execute(new ChangePasswordCommand(userId, dto));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The authenticated profile and the permissions it carries' })
  @ApiResponse({ status: 200, type: CurrentUserResponseDto })
  async me(@CurrentUser() caller: AuthenticatedUser): Promise<CurrentUserResponseDto> {
    // Read from the database rather than from the token: the profile may have
    // changed since it was issued, and this is the route a client polls to find out.
    const user = await this.queryBus.execute<GetUserByIdQuery, User>(
      new GetUserByIdQuery(caller.id),
    );
    return CurrentUserResponseDto.fromDomain(user);
  }
}
