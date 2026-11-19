import { IMaterialCategory, IOwnMaterial, MaterialUnit } from '@chantia/shared';

export const MATERIAL_PORT = Symbol('MATERIAL_PORT');

/**
 * The common catalog, read only, and the organization's own materials. No
 * tenant in any signature: the Prisma layer scopes the own ones to the caller.
 */
export interface MaterialPort {
  /** Every category with its catalog materials, both in display order. */
  listCatalog(): Promise<IMaterialCategory[]>;
  categoryExists(id: string): Promise<boolean>;
  /** The organization's live materials, by label. */
  listOwn(): Promise<IOwnMaterial[]>;
  findOwn(id: string): Promise<IOwnMaterial | null>;
  /** Whether a live material of the caller's already has this label, case aside. */
  isLabelTaken(label: string, exceptId?: string): Promise<boolean>;
  /** Whether a task plans it: its unit is then what the quantities are counted in. */
  isInUse(id: string): Promise<boolean>;
  createOwn(organizationId: string, data: Omit<IOwnMaterial, 'id'>): Promise<IOwnMaterial>;
  updateOwn(
    id: string,
    data: Partial<{ categoryId: string; label: string; unit: MaterialUnit }>,
  ): Promise<IOwnMaterial>;
  /** Sets `deletedAt`: the tasks that planned it keep it. */
  removeOwn(id: string): Promise<void>;
}
