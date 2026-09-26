import { Controller, Get, Header } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IEquipmentCategory, Permission } from '@chantia/shared';
import { RequirePermissions } from '@shared/auth';
import { GetEquipmentCatalogQuery } from '../../application/queries/get-equipment-catalog.query';

/**
 * The equipment catalog — categories and types, labels in both languages,
 * default lifetimes. The same for every organization, and written only by
 * migrations, so a client may keep it as long as it likes.
 */
@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment-catalog')
export class EquipmentCatalogController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermissions(Permission.EQUIPMENT_READ)
  // Private: it is behind a token. An hour: it changes only with a deployment.
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({ summary: 'The equipment catalog, in display order' })
  async findAll(): Promise<IEquipmentCategory[]> {
    return this.queryBus.execute<GetEquipmentCatalogQuery, IEquipmentCategory[]>(
      new GetEquipmentCatalogQuery(),
    );
  }
}
