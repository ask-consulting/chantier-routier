import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IWorksiteCosts, Permission, UserRole, roleHasEveryPermission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateWorksiteCommand } from '../../application/commands/create-worksite.command';
import { GetWorksiteByIdQuery } from '../../application/queries/get-worksite-by-id.query';
import { GetWorksiteCostsQuery } from '../../application/queries/get-worksite-costs.query';
import { GetWorksitesQuery } from '../../application/queries/get-worksites.query';
import { Worksite } from '../../domain/entities/worksite.entity';
import { CreateWorksiteDto } from '../dto/create-worksite.dto';
import { BUDGET_SORT_FIELDS, GetWorksitesDto } from '../dto/get-worksites.dto';
import { PaginatedWorksiteResponseDto } from '../dto/paginated-worksite-response.dto';
import { WorksiteCostsResponseDto } from '../dto/worksite-costs-response.dto';
import { WorksiteResponseDto } from '../dto/worksite-response.dto';

/**
 * Reads carry no tenant parameter: the Prisma layer scopes them to the caller's
 * organization from the verified token (see docs/09-multi-tenant.md). Only the
 * write below names it, because the aggregate itself has to hold one.
 */
@ApiTags('Worksites')
@ApiBearerAuth()
@Controller('worksites')
export class WorksiteController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'List worksites for the organization' })
  @ApiResponse({ status: 200, type: PaginatedWorksiteResponseDto })
  async findAll(
    @CurrentUser('role') role: UserRole,
    @Query() dto: GetWorksitesDto,
  ): Promise<PaginatedWorksiteResponseDto> {
    const includeBudget = this.mayReadBudget(role);

    // Sorting is a read of its own: ordering by budget discloses the ranking
    // without ever printing a figure. Refused rather than silently ignored, so a
    // caller learns the rule instead of getting a list in a puzzling order.
    if (!includeBudget && dto.sortField && BUDGET_SORT_FIELDS.includes(dto.sortField)) {
      throw new ForbiddenException(`Sorting by ${dto.sortField} requires ${Permission.BUDGET_READ}`);
    }

    const result = await this.queryBus.execute<GetWorksitesQuery, SearchResult<Worksite>>(
      new GetWorksitesQuery({
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: { search: dto.search, status: dto.status },
      }),
    );

    return {
      items: result.items.map((w) => WorksiteResponseDto.fromDomain(w, { includeBudget })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Whether this caller may see money on a worksite.
   *
   * `budget:read` is split from `worksite:read` on purpose: a foreman needs the
   * site without its margin. Hiding the column in the interface was never enough
   * — the figure still travelled in the payload, and reading it took opening the
   * network tab. This is where it is actually withheld.
   */
  private mayReadBudget(role: UserRole): boolean {
    return roleHasEveryPermission(role, [Permission.BUDGET_READ]);
  }

  @Post()
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({ summary: 'Create a worksite' })
  @ApiResponse({ status: 201, type: WorksiteResponseDto })
  async create(
    // The one place the tenant is still named: `Worksite` carries an
    // `organizationId`, so the aggregate cannot be built without it. The
    // extension overwrites it with the token's value regardless, so a wrong
    // value here cannot plant a row in someone else's organization.
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateWorksiteDto,
  ): Promise<WorksiteResponseDto> {
    const worksite = await this.commandBus.execute<CreateWorksiteCommand, Worksite>(
      new CreateWorksiteCommand(organizationId, dto),
    );
    // Everyone holding `worksite:manage` today also holds `budget:read`, so this
    // never actually withholds anything. It is here so that re-balancing
    // `ROLE_PERMISSIONS` later cannot quietly turn the creation response into
    // the one endpoint that still leaks a budget.
    return WorksiteResponseDto.fromDomain(worksite, {
      includeBudget: this.mayReadBudget(role),
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'Get a worksite by id' })
  @ApiResponse({ status: 200, type: WorksiteResponseDto })
  async findOne(
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
  ): Promise<WorksiteResponseDto> {
    const worksite = await this.queryBus.execute<GetWorksiteByIdQuery, Worksite>(
      new GetWorksiteByIdQuery(id),
    );
    return WorksiteResponseDto.fromDomain(worksite, {
      includeBudget: this.mayReadBudget(role),
    });
  }

  @Get(':id/costs')
  @RequirePermissions(Permission.WORKSITE_READ, Permission.BUDGET_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute budget vs actual cost for a worksite' })
  @ApiResponse({ status: 200, type: WorksiteCostsResponseDto })
  async costs(@Param('id') id: string): Promise<WorksiteCostsResponseDto> {
    const costs = await this.queryBus.execute<GetWorksiteCostsQuery, IWorksiteCosts>(
      new GetWorksiteCostsQuery(id),
    );
    return WorksiteCostsResponseDto.fromDomain(costs);
  }
}
