import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IWorksiteCosts } from '@chantia/shared';
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

// TODO: replace the `x-organization-id` header with the authenticated tenant
// context once the auth module lands.
@ApiTags('Worksites')
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Tenant (organization) id' })
@Controller('worksites')
export class WorksiteController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List worksites for the organization' })
  @ApiResponse({ status: 200, type: PaginatedWorksiteResponseDto })
  async findAll(
    // Unnamed @Headers() so Nest/Swagger doesn't auto-generate a second
    // `x-organization-id` parameter on top of the class-level @ApiHeader.
    @Headers() headers: Record<string, string | undefined>,
    @Query() dto: GetWorksitesDto,
  ): Promise<PaginatedWorksiteResponseDto> {
    const result = await this.queryBus.execute<GetWorksitesQuery, SearchResult<Worksite>>(
      new GetWorksitesQuery(this.requireOrg(headers['x-organization-id']), {
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
  @ApiOperation({ summary: 'Create a worksite' })
  @ApiResponse({ status: 201, type: WorksiteResponseDto })
  async create(
    // Unnamed @Headers() so Nest/Swagger doesn't auto-generate a second
    // `x-organization-id` parameter on top of the class-level @ApiHeader.
    @Headers() headers: Record<string, string | undefined>,
    @Body() dto: CreateWorksiteDto,
  ): Promise<WorksiteResponseDto> {
    const worksite = await this.commandBus.execute<CreateWorksiteCommand, Worksite>(
      new CreateWorksiteCommand(this.requireOrg(headers['x-organization-id']), dto),
    );
    return WorksiteResponseDto.fromDomain(worksite);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a worksite by id' })
  @ApiResponse({ status: 200, type: WorksiteResponseDto })
  async findOne(@Param('id') id: string): Promise<WorksiteResponseDto> {
    const worksite = await this.queryBus.execute<GetWorksiteByIdQuery, Worksite>(
      new GetWorksiteByIdQuery(id),
    );
    return WorksiteResponseDto.fromDomain(worksite);
  }

  @Get(':id/costs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute budget vs actual cost for a worksite' })
  @ApiResponse({ status: 200, type: WorksiteCostsResponseDto })
  async costs(@Param('id') id: string): Promise<WorksiteCostsResponseDto> {
    const costs = await this.queryBus.execute<GetWorksiteCostsQuery, IWorksiteCosts>(
      new GetWorksiteCostsQuery(id),
    );
    return WorksiteCostsResponseDto.fromDomain(costs);
  }

  private requireOrg(organizationId: string | undefined): string {
    if (!organizationId) {
      throw new BadRequestException('Missing x-organization-id header');
    }
    return organizationId;
  }
}
