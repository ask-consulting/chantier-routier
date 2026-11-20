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
import { ITaskMaterial, Permission, roleHasPermission, UserRole } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import {
  GetTaskMaterialsQuery,
  PlanTaskMaterialCommand,
  RemoveTaskMaterialCommand,
  UpdateTaskMaterialCommand,
} from '../../application/task-materials.messages';
import { PlanTaskMaterialDto, UpdateTaskMaterialDto } from '../dto/task-materials.dto';

/** What each task of a worksite is planned to need, material by material. */
@ApiTags('Planning')
@ApiBearerAuth()
@Controller()
export class TaskMaterialsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('worksites/:worksiteId/task-materials')
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({
    summary: 'The materials planned on the tasks of a worksite',
    description: 'Prices are money: withheld from a caller without `budget:read`.',
  })
  @ApiResponse({ status: 404, description: 'Unknown worksite, or another tenant’s' })
  async find(
    @CurrentUser('role') role: UserRole,
    @Param('worksiteId', ParseUUIDPipe) worksiteId: string,
  ): Promise<ITaskMaterial[]> {
    return this.queryBus.execute<GetTaskMaterialsQuery, ITaskMaterial[]>(
      new GetTaskMaterialsQuery(worksiteId, roleHasPermission(role, Permission.BUDGET_READ)),
    );
  }

  @Post('worksite-tasks/:id/materials')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({ summary: 'Plan how much of a material a task needs' })
  @ApiResponse({ status: 400, description: 'A phase, or an unknown material' })
  @ApiResponse({ status: 409, description: 'Already planned on this task' })
  async plan(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) taskId: string,
    @Body() dto: PlanTaskMaterialDto,
  ): Promise<ITaskMaterial> {
    return this.commandBus.execute<PlanTaskMaterialCommand, ITaskMaterial>(
      new PlanTaskMaterialCommand(organizationId, taskId, dto),
    );
  }

  @Patch('task-materials/:id')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({ summary: 'Change a planned quantity or its expected price' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskMaterialDto,
  ): Promise<ITaskMaterial> {
    return this.commandBus.execute<UpdateTaskMaterialCommand, ITaskMaterial>(
      new UpdateTaskMaterialCommand(id, dto),
    );
  }

  @Delete('task-materials/:id')
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Take a material off a task' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new RemoveTaskMaterialCommand(id));
  }
}
