import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ITaskTeam, ITaskWorker, Permission, roleHasPermission, UserRole } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import {
  AssignTaskWorkerCommand,
  GetTaskTeamQuery,
  LinkTaskEquipmentCommand,
  RemoveTaskWorkerCommand,
  UnlinkTaskEquipmentCommand,
} from '../../application/task-team.messages';
import { AssignTaskWorkerDto, LinkTaskEquipmentDto } from '../dto/task-team.dto';

/** Who and what works on each task of a worksite. */
@ApiTags('Planning')
@ApiBearerAuth()
@Controller()
export class TaskTeamController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('worksites/:worksiteId/task-team')
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({
    summary: 'The workers and machines on the tasks of a worksite',
    description: 'Rates are money: withheld from a caller without `budget:read`.',
  })
  @ApiResponse({ status: 404, description: 'Unknown worksite, or another tenant’s' })
  async find(
    @CurrentUser('role') role: UserRole,
    @Param('worksiteId', ParseUUIDPipe) worksiteId: string,
  ): Promise<ITaskTeam> {
    return this.queryBus.execute<GetTaskTeamQuery, ITaskTeam>(
      new GetTaskTeamQuery(worksiteId, roleHasPermission(role, Permission.BUDGET_READ)),
    );
  }

  @Post('worksite-tasks/:id/workers')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({ summary: 'Put a worker on a task, with how they are paid for it' })
  @ApiResponse({ status: 201, description: 'Assigned' })
  @ApiResponse({ status: 400, description: 'A phase, an unknown worker, or no amount by the task' })
  @ApiResponse({ status: 409, description: 'Already on this task' })
  async assignWorker(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignTaskWorkerDto,
  ): Promise<ITaskWorker> {
    return this.commandBus.execute<AssignTaskWorkerCommand, ITaskWorker>(
      new AssignTaskWorkerCommand(organizationId, taskId, dto),
    );
  }

  @Delete('task-workers/:id')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Take a worker off a task' })
  async removeWorker(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new RemoveTaskWorkerCommand(id));
  }

  @Post('worksite-tasks/:id/equipment')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Put a machine booked on the worksite on one of its tasks' })
  @ApiResponse({ status: 400, description: 'A phase, or a machine not booked on this worksite' })
  @ApiResponse({ status: 409, description: 'Already on this task' })
  async linkEquipment(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: LinkTaskEquipmentDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new LinkTaskEquipmentCommand(organizationId, taskId, dto.equipmentAssignmentId),
    );
  }

  @Delete('task-equipment/:id')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Take a machine off a task' })
  async unlinkEquipment(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new UnlinkTaskEquipmentCommand(id));
  }
}
