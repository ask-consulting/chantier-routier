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
import { CreateClientCommand } from '../../application/commands/create-client.command';
import { DeleteClientCommand } from '../../application/commands/delete-client.command';
import { UpdateClientCommand } from '../../application/commands/update-client.command';
import { GetClientByIdQuery } from '../../application/queries/get-client-by-id.query';
import { GetClientsQuery } from '../../application/queries/get-clients.query';
import { Client } from '../../domain/entities/client.entity';
import { ClientResponseDto } from '../dto/client-response.dto';
import { CreateClientDto } from '../dto/create-client.dto';
import { GetClientsDto } from '../dto/get-clients.dto';
import { PaginatedClientResponseDto } from '../dto/paginated-client-response.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

/**
 * Who the worksites are built for — a person or a legal entity — with the
 * people to call there and where the invoices go.
 *
 * Reads carry no tenant parameter: the Prisma layer scopes them to the
 * caller's organization (docs/09-multi-tenant.md). Only the creation names
 * it, because the row has to hold one.
 */
@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.CLIENT_READ)
  @ApiOperation({ summary: 'List the clients of the organization', description: 'By name.' })
  @ApiResponse({ status: 200, type: PaginatedClientResponseDto })
  async findAll(@Query() dto: GetClientsDto): Promise<PaginatedClientResponseDto> {
    const result = await this.queryBus.execute<GetClientsQuery, SearchResult<Client>>(
      new GetClientsQuery({
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: { search: dto.search, type: dto.type },
      }),
    );

    return {
      items: result.items.map((client) => ClientResponseDto.fromDomain(client)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @RequirePermissions(Permission.CLIENT_READ)
  @ApiOperation({ summary: 'Get one client, with its contacts' })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    const client = await this.queryBus.execute<GetClientByIdQuery, Client>(
      new GetClientByIdQuery(id),
    );
    return ClientResponseDto.fromDomain(client);
  }

  @Post()
  @RequirePermissions(Permission.CLIENT_MANAGE)
  @ApiOperation({ summary: 'Create a client, its contacts included' })
  @ApiResponse({ status: 201, type: ClientResponseDto })
  @ApiResponse({ status: 400, description: 'Names that do not fit the type' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.commandBus.execute<CreateClientCommand, Client>(
      new CreateClientCommand(organizationId, dto),
    );
    return ClientResponseDto.fromDomain(client);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  @ApiOperation({
    summary: 'Change a client',
    description:
      'Partial. `contacts`, when sent, is the whole new list: keep a contact by sending its ' +
      '`id`, remove it by leaving it out. Switching `type` clears the other type’s names.',
  })
  @ApiResponse({ status: 200, type: ClientResponseDto })
  @ApiResponse({ status: 404, description: 'Unknown client, or another tenant’s' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.commandBus.execute<UpdateClientCommand, Client>(
      new UpdateClientCommand(id, dto),
    );
    return ClientResponseDto.fromDomain(client);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLIENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a client',
    description:
      'Never a real row deletion — `deletedAt` is set, like workers and worksites. Refused ' +
      'while a current worksite still points at the client.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Unknown client, or another tenant’s' })
  @ApiResponse({ status: 409, description: 'Current worksites still point at this client' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteClientCommand(id));
  }
}
