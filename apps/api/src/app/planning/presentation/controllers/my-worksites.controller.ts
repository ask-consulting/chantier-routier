import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IMyWorksite, IWorksiteMember, Permission } from '@chantia/shared';
import { AuthenticatedUser, CurrentUser, RequirePermissions } from '@shared/auth';
import {
  GetMyWorksiteQuery,
  GetMyWorksitesQuery,
  GetWorksiteMembersQuery,
  SetWorksiteMembersCommand,
} from '../../application/worksite-plan.messages';
import { UpdateWorksiteMembersDto } from '../dto/worksite-plan.dto';

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * « Mes chantiers »: what each person works on. An admin sees every worksite,
 * everybody else the ones they are a member of. Applied here, by the server:
 * a worksite the caller may not see answers 404.
 */
@ApiTags('Planning')
@ApiBearerAuth()
@Controller('my-worksites')
export class MyWorksitesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'The worksites in progress the caller works on, at risk first' })
  async findAll(@CurrentUser() caller: AuthenticatedUser): Promise<IMyWorksite[]> {
    return this.queryBus.execute<GetMyWorksitesQuery, IMyWorksite[]>(
      new GetMyWorksitesQuery({ id: caller.id, role: caller.role }, today()),
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'One worksite the caller works on, with its figures' })
  @ApiResponse({ status: 404, description: 'Unknown, or not one of the caller’s worksites' })
  async findOne(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IMyWorksite> {
    return this.queryBus.execute<GetMyWorksiteQuery, IMyWorksite>(
      new GetMyWorksiteQuery({ id: caller.id, role: caller.role }, id, today()),
    );
  }
}

/** Who works on a worksite. */
@ApiTags('Planning')
@ApiBearerAuth()
@Controller('worksites/:worksiteId/members')
export class WorksiteMembersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'The accounts that work on a worksite' })
  async find(@Param('worksiteId', ParseUUIDPipe) worksiteId: string): Promise<IWorksiteMember[]> {
    return this.queryBus.execute<GetWorksiteMembersQuery, IWorksiteMember[]>(
      new GetWorksiteMembersQuery(worksiteId),
    );
  }

  @Put()
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set who works on a worksite: the list replaces the stored one' })
  @ApiResponse({ status: 400, description: 'An account unknown, inactive or another tenant’s' })
  async replace(
    @CurrentUser('organizationId') organizationId: string,
    @Param('worksiteId', ParseUUIDPipe) worksiteId: string,
    @Body() dto: UpdateWorksiteMembersDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new SetWorksiteMembersCommand(organizationId, worksiteId, dto.userIds),
    );
  }
}
