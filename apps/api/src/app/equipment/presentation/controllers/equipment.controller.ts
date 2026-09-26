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
import {
  Permission,
  UserRole,
  equipmentTypesOf,
  roleHasEveryPermission,
} from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateEquipmentCommand } from '../../application/commands/create-equipment.command';
import { DeleteEquipmentCommand } from '../../application/commands/delete-equipment.command';
import { UpdateEquipmentCommand } from '../../application/commands/update-equipment.command';
import { GetEquipmentByIdQuery } from '../../application/queries/get-equipment-by-id.query';
import { GetEquipmentListQuery } from '../../application/queries/get-equipment-list.query';
import { Equipment } from '../../domain/entities/equipment.entity';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { EquipmentResponseDto } from '../dto/equipment-response.dto';
import { GetEquipmentListDto } from '../dto/get-equipment-list.dto';
import { PaginatedEquipmentResponseDto } from '../dto/paginated-equipment-response.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';

/** Today, as the day the computed figures are for. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The fleet — every machine the organization owns, leases or hires, each
 * typed from the fixed catalog in `@chantia/shared`.
 *
 * Money — prices, payments, today's cost — is withheld from a caller without
 * `budget:read`, the same rule as a worksite's budget: a foreman sees which
 * machines exist, not what they cost.
 */
@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  private mayReadMoney(role: UserRole): boolean {
    return roleHasEveryPermission(role, [Permission.BUDGET_READ]);
  }

  @Get()
  @RequirePermissions(Permission.EQUIPMENT_READ)
  @ApiOperation({ summary: 'List the fleet', description: 'By designation.' })
  @ApiResponse({ status: 200, type: PaginatedEquipmentResponseDto })
  async findAll(
    @CurrentUser('role') role: UserRole,
    @Query() dto: GetEquipmentListDto,
  ): Promise<PaginatedEquipmentResponseDto> {
    const result = await this.queryBus.execute<GetEquipmentListQuery, SearchResult<Equipment>>(
      new GetEquipmentListQuery({
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: {
          search: dto.search,
          status: dto.status,
          acquisitionMethod: dto.acquisitionMethod,
          // A category is not a column: it is every type code filed under it.
          typeCode: dto.category
            ? { in: equipmentTypesOf(dto.category).map((type) => type.code) }
            : undefined,
        },
      }),
    );

    const options = { includeMoney: this.mayReadMoney(role), today: today() };
    return {
      items: result.items.map((equipment) => EquipmentResponseDto.fromDomain(equipment, options)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.EQUIPMENT_READ)
  @ApiOperation({ summary: 'Get one machine' })
  @ApiResponse({ status: 200, type: EquipmentResponseDto })
  async findOne(
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EquipmentResponseDto> {
    const equipment = await this.queryBus.execute<GetEquipmentByIdQuery, Equipment>(
      new GetEquipmentByIdQuery(id),
    );
    return EquipmentResponseDto.fromDomain(equipment, {
      includeMoney: this.mayReadMoney(role),
      today: today(),
    });
  }

  @Post()
  @RequirePermissions(Permission.EQUIPMENT_MANAGE, Permission.BUDGET_MANAGE)
  @ApiOperation({
    summary: 'Add a machine to the fleet',
    description:
      'Needs budget:manage as well: a machine is recorded with what it cost, and a price ' +
      'is written by somebody allowed to set money.',
  })
  @ApiResponse({ status: 201, type: EquipmentResponseDto })
  @ApiResponse({ status: 400, description: 'Fields that do not fit the acquisition method' })
  @ApiResponse({ status: 409, description: 'Fleet number already used' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateEquipmentDto,
  ): Promise<EquipmentResponseDto> {
    const equipment = await this.commandBus.execute<CreateEquipmentCommand, Equipment>(
      new CreateEquipmentCommand(organizationId, dto),
    );
    return EquipmentResponseDto.fromDomain(equipment, {
      includeMoney: this.mayReadMoney(role),
      today: today(),
    });
  }

  @Patch(':id')
  @RequirePermissions(Permission.EQUIPMENT_MANAGE, Permission.BUDGET_MANAGE)
  @ApiOperation({
    summary: 'Change a machine',
    description:
      'Partial; the rules are checked on the merged result. Selling or scrapping a machine ' +
      'is `status: retired` with a `disposalDate`, not a deletion.',
  })
  @ApiResponse({ status: 200, type: EquipmentResponseDto })
  @ApiResponse({ status: 404, description: 'Unknown machine, or another tenant’s' })
  async update(
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<EquipmentResponseDto> {
    const equipment = await this.commandBus.execute<UpdateEquipmentCommand, Equipment>(
      new UpdateEquipmentCommand(id, dto),
    );
    return EquipmentResponseDto.fromDomain(equipment, {
      includeMoney: this.mayReadMoney(role),
      today: today(),
    });
  }

  @Delete(':id')
  @RequirePermissions(Permission.EQUIPMENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a machine recorded by mistake',
    description: 'Never a real row deletion — `deletedAt` is set. A machine sold is retired instead.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Unknown machine, or another tenant’s' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteEquipmentCommand(id));
  }
}
