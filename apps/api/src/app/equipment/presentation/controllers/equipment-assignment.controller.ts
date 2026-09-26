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
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole, roleHasEveryPermission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateEquipmentAssignmentCommand } from '../../application/commands/create-equipment-assignment.command';
import { DeleteEquipmentAssignmentCommand } from '../../application/commands/delete-equipment-assignment.command';
import { UpdateEquipmentAssignmentCommand } from '../../application/commands/update-equipment-assignment.command';
import { GetEquipmentAssignmentsQuery } from '../../application/queries/get-equipment-assignments.query';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';
import {
  CreateEquipmentAssignmentDto,
  EquipmentAssignmentResponseDto,
  GetEquipmentAssignmentsDto,
  PaginatedEquipmentAssignmentResponseDto,
  UpdateEquipmentAssignmentDto,
} from '../dto/equipment-assignment.dto';

/**
 * Which machine is on which worksite, and when — the planning that puts a
 * machine's daily cost into a worksite's. One machine is never in two places
 * on the same day, nor on a day it is not the organization's to use.
 */
@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment-assignments')
export class EquipmentAssignmentController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  private includeMoney(role: UserRole): { includeMoney: boolean } {
    return { includeMoney: roleHasEveryPermission(role, [Permission.BUDGET_READ]) };
  }

  @Get()
  @RequirePermissions(Permission.EQUIPMENT_READ)
  @ApiOperation({ summary: 'List assignments, by machine or by worksite — chronological' })
  @ApiResponse({ status: 200, type: PaginatedEquipmentAssignmentResponseDto })
  async findAll(
    @CurrentUser('role') role: UserRole,
    @Query() dto: GetEquipmentAssignmentsDto,
  ): Promise<PaginatedEquipmentAssignmentResponseDto> {
    const result = await this.queryBus.execute<
      GetEquipmentAssignmentsQuery,
      SearchResult<EquipmentAssignment>
    >(
      new GetEquipmentAssignmentsQuery({
        page: dto.page,
        limit: dto.limit,
        filters: { equipmentId: dto.equipmentId, worksiteId: dto.worksiteId },
      }),
    );
    const options = this.includeMoney(role);
    return {
      items: result.items.map((item) => EquipmentAssignmentResponseDto.fromDomain(item, options)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post()
  @RequirePermissions(Permission.EQUIPMENT_MANAGE)
  @ApiOperation({ summary: 'Assign a machine to a worksite for a period' })
  @ApiResponse({ status: 201, type: EquipmentAssignmentResponseDto })
  @ApiResponse({ status: 400, description: 'Unknown machine or worksite, or days it is not available' })
  @ApiResponse({ status: 409, description: 'Already assigned elsewhere for part of the period' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateEquipmentAssignmentDto,
  ): Promise<EquipmentAssignmentResponseDto> {
    const assignment = await this.commandBus.execute<
      CreateEquipmentAssignmentCommand,
      EquipmentAssignment
    >(new CreateEquipmentAssignmentCommand(organizationId, dto));
    return EquipmentAssignmentResponseDto.fromDomain(assignment, this.includeMoney(role));
  }

  @Patch(':id')
  @RequirePermissions(Permission.EQUIPMENT_MANAGE)
  @ApiOperation({ summary: 'Move an assignment — other dates, or another worksite' })
  @ApiResponse({ status: 200, type: EquipmentAssignmentResponseDto })
  @ApiResponse({ status: 404, description: 'Unknown assignment, or another tenant’s' })
  async update(
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentAssignmentDto,
  ): Promise<EquipmentAssignmentResponseDto> {
    const assignment = await this.commandBus.execute<
      UpdateEquipmentAssignmentCommand,
      EquipmentAssignment
    >(new UpdateEquipmentAssignmentCommand(id, dto));
    return EquipmentAssignmentResponseDto.fromDomain(assignment, this.includeMoney(role));
  }

  @Delete(':id')
  @RequirePermissions(Permission.EQUIPMENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an assignment — its cost leaves the worksite’s' })
  @ApiResponse({ status: 204, description: 'Cancelled' })
  @ApiResponse({ status: 404, description: 'Unknown assignment, or another tenant’s' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteEquipmentAssignmentCommand(id));
  }
}
