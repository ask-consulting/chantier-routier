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
import { Permission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateWorkerCommand } from '../../application/commands/create-worker.command';
import { DeleteWorkerCommand } from '../../application/commands/delete-worker.command';
import { UpdateWorkerCommand } from '../../application/commands/update-worker.command';
import { GetWorkerByIdQuery } from '../../application/queries/get-worker-by-id.query';
import { GetWorkersQuery } from '../../application/queries/get-workers.query';
import { Worker } from '../../domain/entities/worker.entity';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { GetWorkersDto } from '../dto/get-workers.dto';
import { PaginatedWorkerResponseDto } from '../dto/paginated-worker-response.dto';
import { UpdateWorkerDto } from '../dto/update-worker.dto';
import { WorkerResponseDto } from '../dto/worker-response.dto';

/**
 * The payroll: the people whose hours cost money, whether or not they can sign
 * in. Most of them never will — a worksite crew has few smartphones — and that
 * is exactly why this resource is not `users`.
 *
 * Reads carry no tenant parameter: the Prisma layer scopes them to the caller's
 * organization from the verified token (see docs/09-multi-tenant.md). Only the
 * creation names it, because the row itself has to hold one.
 */
@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkerController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.WORKER_READ)
  @ApiOperation({
    summary: 'List the workers of the organization',
    description: 'Alphabetical by default — a payroll is read by name, not by arrival date.',
  })
  @ApiResponse({ status: 200, type: PaginatedWorkerResponseDto })
  async findAll(@Query() dto: GetWorkersDto): Promise<PaginatedWorkerResponseDto> {
    const result = await this.queryBus.execute<GetWorkersQuery, SearchResult<Worker>>(
      new GetWorkersQuery({
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: { search: dto.search, active: dto.active },
      }),
    );

    return {
      items: result.items.map((worker) => WorkerResponseDto.fromDomain(worker)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.WORKER_READ)
  @ApiOperation({ summary: 'Get one worker' })
  @ApiResponse({ status: 200, type: WorkerResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WorkerResponseDto> {
    const worker = await this.queryBus.execute<GetWorkerByIdQuery, Worker>(
      new GetWorkerByIdQuery(id),
    );
    return WorkerResponseDto.fromDomain(worker);
  }

  @Post()
  @RequirePermissions(Permission.WORKER_MANAGE)
  @ApiOperation({
    summary: 'Add somebody to the payroll',
    description:
      'Creates an HR record and nothing else — no email, no password, no access. Giving this ' +
      'person an account is a separate act: `POST /users` with their `workerId`.',
  })
  @ApiResponse({ status: 201, type: WorkerResponseDto })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateWorkerDto,
  ): Promise<WorkerResponseDto> {
    const worker = await this.commandBus.execute<CreateWorkerCommand, Worker>(
      new CreateWorkerCommand(organizationId, dto),
    );
    return WorkerResponseDto.fromDomain(worker);
  }

  @Patch(':id')
  @RequirePermissions(Permission.WORKER_MANAGE)
  @ApiOperation({
    summary: 'Rename, re-rate or deactivate a worker',
    description:
      'A new hourly rate applies to hours recorded from now on; past timesheets keep their own ' +
      'value, so a raise does not rewrite a closed month.',
  })
  @ApiResponse({ status: 200, type: WorkerResponseDto })
  @ApiResponse({ status: 404, description: 'Unknown worker, or another tenant’s' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkerDto,
  ): Promise<WorkerResponseDto> {
    const worker = await this.commandBus.execute<UpdateWorkerCommand, Worker>(
      new UpdateWorkerCommand(id, dto),
    );
    return WorkerResponseDto.fromDomain(worker);
  }

  @Delete(':id')
  @RequirePermissions(Permission.WORKER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a worker who has never been counted',
    description:
      'Refused as soon as one timesheet points at them: `timesheets.worker_id` cascades, so the ' +
      'deletion would erase the hours and silently rewrite the cost of past worksites. Somebody ' +
      'who leaves the company is **deactivated**, which keeps the history.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Unknown worker, or another tenant’s' })
  @ApiResponse({ status: 409, description: 'Has timesheets — deactivate instead' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteWorkerCommand(id));
  }
}
