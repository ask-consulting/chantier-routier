/**
 * What a planned quantity is expected to cost: the unit price times the
 * quantity, rounded to the currency's smallest unit. `null` without a price —
 * a quantity can be planned before anybody has asked a supplier.
 */
export function plannedMaterialCost(quantity: number, unitPrice: number | null): number | null {
  return unitPrice === null ? null : Math.round(quantity * unitPrice);
}

/** The most digits a quantity keeps after the point: grams of a tonne. */
export const QUANTITY_DECIMALS = 3;

/** Largest quantity the database column holds, `NUMERIC(14, 3)`. */
export const MAX_QUANTITY = 99_999_999_999;
