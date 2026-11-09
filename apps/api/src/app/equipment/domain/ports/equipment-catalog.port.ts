import { IEquipmentCategory } from '@chantia/shared';
import { EquipmentTypeDefaults } from '../entities/equipment.entity';

/**
 * The equipment catalog — global, the same for every organization, written
 * only by migrations. Read here, never written.
 */
export interface EquipmentCatalogPort {
  /** One type's defaults, or `null` for an id the catalog does not have. */
  findType(id: string): Promise<EquipmentTypeDefaults | null>;
  /** Every category with its types, both in display order. */
  listCategories(): Promise<IEquipmentCategory[]>;
}

export const EQUIPMENT_CATALOG_PORT = Symbol('EquipmentCatalogPort');
