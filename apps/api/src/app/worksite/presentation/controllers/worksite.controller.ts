import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IWorksiteCosts, Permission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateWorksiteCommand } from '../../application/commands/create-worksite.command';
import { GetWorksiteByIdQuery } from '../../application/queries/get-worksite-by-id.query';
import { GetWorksiteCostsQuery } from '../../application/queries/get-worksite-costs.query';
import { GetWorksitesQuery } from '../../application/queries/get-worksites.query';
import { Worksite } from '../../domain/entities/worksite.entity';
import { CreateWorksiteDto } from '../dto/create-worksite.dto';
import { GetWorksitesDto } from '../dto/get-worksites.dto';
import { PaginatedWorksiteResponseDto } from '../dto/paginated-worksite-response.dto';
import { WorksiteCostsResponseDto } from '../dto/worksite-costs-response.dto';
import { WorksiteResponseDto } from '../dto/worksite-response.dto';

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
    // The tenant comes from the verified access token — it can no longer be
    // chosen by the caller, which is what makes the isolation real.
    @CurrentUser('organizationId') organizationId: string,
    @Query() dto: GetWorksitesDto,
  ): Promise<PaginatedWorksiteResponseDto> {
    const result = await this.queryBus.execute<GetWorksitesQuery, SearchResult<Worksite>>(
      new GetWorksitesQuery(organizationId, {
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: { search: dto.search, status: dto.status },
      }),
    );

    return {
      items: result.items.map((w) => WorksiteResponseDto.fromDomain(w)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post()
  @RequirePermissions(Permission.WORKSITE_MANAGE)
  @ApiOperation({ summary: 'Create a worksite' })
  @ApiResponse({ status: 201, type: WorksiteResponseDto })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateWorksiteDto,
  ): Promise<WorksiteResponseDto> {
    const worksite = await this.commandBus.execute<CreateWorksiteCommand, Worksite>(
      new CreateWorksiteCommand(organizationId, dto),
    );
    return WorksiteResponseDto.fromDomain(worksite);
  }

  @Get(':id')
  @RequirePermissions(Permission.WORKSITE_READ)
  @ApiOperation({ summary: 'Get a worksite by id' })
  @ApiResponse({ status: 200, type: WorksiteResponseDto })
  async findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ): Promise<WorksiteResponseDto> {
    const worksite = await this.queryBus.execute<GetWorksiteByIdQuery, Worksite>(
      new GetWorksiteByIdQuery(organizationId, id),
    );
    return WorksiteResponseDto.fromDomain(worksite);
  }

  @Get(':id/costs')
  @RequirePermissions(Permission.WORKSITE_READ, Permission.BUDGET_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute budget vs actual cost for a worksite' })
  @ApiResponse({ status: 200, type: WorksiteCostsResponseDto })
  async costs(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ): Promise<WorksiteCostsResponseDto> {
    const costs = await this.queryBus.execute<GetWorksiteCostsQuery, IWorksiteCosts>(
      new GetWorksiteCostsQuery(organizationId, id),
    );
    return WorksiteCostsResponseDto.fromDomain(costs);
  }
}
