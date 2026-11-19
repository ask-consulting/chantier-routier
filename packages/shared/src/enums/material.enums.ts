/**
 * The units a material is counted in. A closed list: a quantity is only
 * comparable with another in the same unit, and purchases, deliveries and
 * stock will all be counted in the unit the material was given.
 */
export enum MaterialUnit {
  TONNE = 't',
  CUBIC_METRE = 'm3',
  SQUARE_METRE = 'm2',
  METRE = 'm',
  KILOGRAM = 'kg',
  LITRE = 'l',
  /** A bag, as cement and lime are sold: 50 kg unless the supplier says otherwise. */
  BAG = 'bag',
  /** Counted one by one: bricks, blocks, manholes. */
  PIECE = 'piece',
}

export const MATERIAL_UNITS: readonly MaterialUnit[] = Object.values(MaterialUnit);
