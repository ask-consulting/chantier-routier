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
import { AuthenticatedUser, CurrentUser, RequirePermissions } from '@shared/auth';
import { SearchResult } from '@shared/domain/search.types';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { DeleteUserCommand } from '../../application/commands/delete-user.command';
import { UpdateUserCommand } from '../../application/commands/update-user.command';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { GetUsersQuery } from '../../application/queries/get-users.query';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { GetUsersDto } from '../dto/get-users.dto';
import { PaginatedUserResponseDto } from '../dto/paginated-user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

/**
 * Account administration inside one tenant.
 *
 * The organization is always taken from the caller's token, never from the
 * request, so there is no way to reach another tenant's accounts — the routes
 * simply have no parameter for it.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List the accounts of the organization' })
  @ApiResponse({ status: 200, type: PaginatedUserResponseDto })
  async findAll(@Query() dto: GetUsersDto): Promise<PaginatedUserResponseDto> {
    const result = await this.queryBus.execute<GetUsersQuery, SearchResult<User>>(
      new GetUsersQuery({
        page: dto.page,
        limit: dto.limit,
        paginated: dto.paginated,
        sort: dto.sortField ? { field: dto.sortField, order: dto.sortOrder ?? 'asc' } : undefined,
        filters: { search: dto.search, role: dto.role, active: dto.active },
      }),
    );

    return {
      items: result.items.map((user) => UserResponseDto.fromDomain(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Create an account in the organization' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already used' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.commandBus.execute<CreateUserCommand, User>(
      new CreateUserCommand(organizationId, dto),
    );
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get one account' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.queryBus.execute<GetUserByIdQuery, User>(new GetUserByIdQuery(id));
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Update an account’s profile, role or activation' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Would leave the organization without an admin' })
  async update(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.commandBus.execute<UpdateUserCommand, User>(
      new UpdateUserCommand(id, dto, caller.id),
    );
    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an account',
    description: 'Prefer `PATCH { active: false }` when the person’s field data must keep an author.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 409, description: 'Own account, or the last admin' })
  async remove(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.commandBus.execute(new DeleteUserCommand(id, caller.id));
  }
}
