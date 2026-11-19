import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IMaterialCategory, IOwnMaterial, Permission } from '@chantia/shared';
import { CurrentUser, RequirePermissions } from '@shared/auth';
import {
  CreateOwnMaterialCommand,
  GetMaterialCatalogQuery,
  GetOwnMaterialsQuery,
  RemoveOwnMaterialCommand,
  UpdateOwnMaterialCommand,
} from '../../application/material.messages';
import { CreateOwnMaterialDto, UpdateOwnMaterialDto } from '../dto/material.dto';

/** The common material catalog, and the materials an organization adds beside it. */
@ApiTags('Materials')
@ApiBearerAuth()
@Controller()
export class MaterialController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('material-catalog')
  @RequirePermissions(Permission.MATERIAL_READ)
  // Private: it is behind a token. An hour: it changes only with a deployment.
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({ summary: 'The common material catalog, in display order, every language' })
  async catalog(): Promise<IMaterialCategory[]> {
    return this.queryBus.execute<GetMaterialCatalogQuery, IMaterialCategory[]>(
      new GetMaterialCatalogQuery(),
    );
  }

  @Get('materials')
  @RequirePermissions(Permission.MATERIAL_READ)
  @ApiOperation({ summary: 'The organization’s own materials, by name' })
  async findOwn(): Promise<IOwnMaterial[]> {
    return this.queryBus.execute<GetOwnMaterialsQuery, IOwnMaterial[]>(new GetOwnMaterialsQuery());
  }

  @Post('materials')
  @RequirePermissions(Permission.MATERIAL_MANAGE)
  @ApiOperation({ summary: 'Add a material of the organization’s own' })
  @ApiResponse({ status: 400, description: 'Unknown category' })
  @ApiResponse({ status: 409, description: 'The name is taken' })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateOwnMaterialDto,
  ): Promise<IOwnMaterial> {
    return this.commandBus.execute<CreateOwnMaterialCommand, IOwnMaterial>(
      new CreateOwnMaterialCommand(organizationId, dto),
    );
  }

  @Patch('materials/:id')
  @RequirePermissions(Permission.MATERIAL_MANAGE)
  @ApiOperation({ summary: 'Rename, refile, or change the unit while no task counts in it' })
  @ApiResponse({ status: 409, description: 'The name is taken, or the unit is in use' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOwnMaterialDto,
  ): Promise<IOwnMaterial> {
    return this.commandBus.execute<UpdateOwnMaterialCommand, IOwnMaterial>(
      new UpdateOwnMaterialCommand(id, dto),
    );
  }

  @Delete('materials/:id')
  @RequirePermissions(Permission.MATERIAL_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an own material',
    description: 'Never a real delete: the tasks that planned it keep it.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new RemoveOwnMaterialCommand(id));
  }
}
