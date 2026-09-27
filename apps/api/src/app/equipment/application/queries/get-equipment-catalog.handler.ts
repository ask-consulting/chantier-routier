import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEquipmentCategory } from '@chantia/shared';
import {
  EQUIPMENT_CATALOG_PORT,
  EquipmentCatalogPort,
} from '../../domain/ports/equipment-catalog.port';
import { GetEquipmentCatalogQuery } from './get-equipment-catalog.query';

@QueryHandler(GetEquipmentCatalogQuery)
export class GetEquipmentCatalogHandler implements IQueryHandler<GetEquipmentCatalogQuery> {
  constructor(
    @Inject(EQUIPMENT_CATALOG_PORT)
    private readonly catalog: EquipmentCatalogPort,
  ) {}

  async execute(): Promise<IEquipmentCategory[]> {
    return this.catalog.listCategories();
  }
}
