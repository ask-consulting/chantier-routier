import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IWorksitePlan, Permission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import {
  DeleteWorksitePlanCommand,
  GetWorksitePlanQuery,
  InitializeWorksitePlanCommand,
  UpdateWorksiteTaskCommand,
} from '../../application/worksite-plan.messages';
import { InitializeWorksitePlanDto, UpdateWorksiteTaskDto } from '../dto/worksite-plan.dto';

/** A worksite's planning: started from the plan library, then its own. */
@ApiTags('Planning')
@ApiBearerAuth()
@Controller('worksites/:worksiteId/plan')
export class WorksitePlanController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'The planning of a worksite, empty until it is started' })
  @ApiResponse({ status: 404, description: 'Unknown worksite, or another tenant’s' })
  async find(@Param('worksiteId', ParseUUIDPipe) worksiteId: string): Promise<IWorksitePlan> {
    return this.queryBus.execute<GetWorksitePlanQuery, IWorksitePlan>(
      new GetWorksitePlanQuery(worksiteId),
    );
  }

  @Post()
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({
    summary: 'Start the planning from a plan of the library',
    description:
      'Copies the plan and proposes dates over the worksite’s period: the lowest lines ' +
      'one after the other. A starting point to adjust.',
  })
  @ApiResponse({ status: 201, description: 'Started' })
  @ApiResponse({ status: 400, description: 'No period on the worksite, or no single source' })
  @ApiResponse({ status: 404, description: 'Unknown worksite or plan' })
  @ApiResponse({ status: 409, description: 'The worksite already has a planning' })
  async initialize(
    @CurrentUser('organizationId') organizationId: string,
    @Param('worksiteId', ParseUUIDPipe) worksiteId: string,
    @Body() dto: InitializeWorksitePlanDto,
  ): Promise<IWorksitePlan> {
    return this.commandBus.execute<InitializeWorksitePlanCommand, IWorksitePlan>(
      new InitializeWorksitePlanCommand(organizationId, worksiteId, dto),
    );
  }

  @Delete()
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the planning, to start again from another plan' })
  @ApiResponse({ status: 404, description: 'Unknown worksite, or another tenant’s' })
  async remove(@Param('worksiteId', ParseUUIDPipe) worksiteId: string): Promise<void> {
    await this.commandBus.execute(new DeleteWorksitePlanCommand(worksiteId));
  }
}

@ApiTags('Planning')
@ApiBearerAuth()
@Controller('worksite-tasks')
export class WorksiteTaskController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':id')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move a lowest line of the planning' })
  @ApiResponse({ status: 400, description: 'Dates reversed, or a line with lines under it' })
  @ApiResponse({ status: 404, description: 'Unknown line, or another tenant’s' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorksiteTaskDto,
  ): Promise<void> {
    await this.commandBus.execute(new UpdateWorksiteTaskCommand(id, dto));
  }
}
