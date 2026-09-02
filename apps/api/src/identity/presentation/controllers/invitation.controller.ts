import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@chantia/shared';
import { AuthenticatedUser, CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CancelInvitationCommand } from '../../application/commands/cancel-invitation.command';
import { ResendInvitationCommand } from '../../application/commands/resend-invitation.command';
import type { IssuedInvitationLink } from '../../application/services/invitation-issuer.service';
import { GetInvitationsQuery } from '../../application/queries/get-invitations.query';
import { InvitationListItem } from '../../domain/read-models/invitation-list-item';
import { FreshAccountGuard } from '../guards/fresh-account.guard';
import { GetInvitationsDto } from '../dto/get-invitations.dto';
import {
  InvitationListItemDto,
  PaginatedInvitationResponseDto,
  ResentInvitationDto,
} from '../dto/invitation-list-response.dto';

/**
 * The invitations already sent — who is still waiting, who never came.
 *
 * Its own controller rather than three more routes under `/users`: the resource
 * is the invitation, not the account, and the screen that reads it is its own
 * screen. Creating one still belongs to `POST /users` — inviting somebody *is*
 * creating their account.
 *
 * The organization is always taken from the caller's token. `invitations`
 * carries no organization column of its own (it hangs off `app_users`), so each
 * handler checks the boundary explicitly and answers "not found" for a row
 * belonging to somebody else — never "forbidden", which would confirm it exists.
 */
@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invitations')
// Same reasoning as `UserController`: these routes grant and revoke access, so
// none of them may be served on a five-minute-old photograph of an account that
// has since been deactivated or demoted.
@UseGuards(FreshAccountGuard)
export class InvitationController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({
    summary: 'List the invitations of the organization',
    description:
      'Pending first, then expired, then accepted — the order the screen defaults to, done in ' +
      'SQL so page 2 follows page 1. Filterable by status and by a free-text search over first ' +
      'name, last name and email.',
  })
  @ApiResponse({ status: 200, type: PaginatedInvitationResponseDto })
  async findAll(
    @CurrentUser() caller: AuthenticatedUser,
    @Query() dto: GetInvitationsDto,
  ): Promise<PaginatedInvitationResponseDto> {
    const result = await this.queryBus.execute<
      GetInvitationsQuery,
      SearchResult<InvitationListItem>
    >(
      new GetInvitationsQuery({
        organizationId: caller.organizationId,
        page: dto.page,
        limit: dto.limit,
        search: dto.search,
        status: dto.status,
      }),
    );

    return {
      items: result.items.map((item) => InvitationListItemDto.fromReadModel(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post(':id/resend')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({
    summary: 'Send the invitation again',
    description:
      'Mints a **new** link and closes the previous one — the clear-text token was never ' +
      'stored, so the first mail cannot be reproduced, and a link about to lapse is usually ' +
      'the reason somebody asks. Pending invitations only.',
  })
  @ApiResponse({ status: 201, type: ResentInvitationDto })
  @ApiResponse({ status: 404, description: 'Unknown invitation, or another tenant’s' })
  @ApiResponse({ status: 409, description: 'Already accepted, or expired' })
  async resend(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResentInvitationDto> {
    const issued = await this.commandBus.execute<ResendInvitationCommand, IssuedInvitationLink>(
      new ResendInvitationCommand(id, caller.organizationId, caller.id),
    );

    return {
      invitationPath: issued.invitationPath,
      expiresAt: issued.expiresAt.toISOString(),
    };
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel the invitation',
    description:
      'Expires it immediately: the link in the invitee’s inbox stops working, and the row ' +
      'survives as the trail of who invited whom and that it was called off. The account is ' +
      'untouched — deleting the person is a different button.',
  })
  @ApiResponse({ status: 204, description: 'Cancelled' })
  @ApiResponse({ status: 404, description: 'Unknown invitation, or another tenant’s' })
  @ApiResponse({ status: 409, description: 'Already accepted, or expired' })
  async cancel(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.commandBus.execute(new CancelInvitationCommand(id, caller.organizationId));
  }
}
