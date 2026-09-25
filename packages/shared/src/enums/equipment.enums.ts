/** The families the equipment catalog is grouped by. */
export enum EquipmentCategory {
  EARTHMOVING = 'earthmoving',
  COMPACTION = 'compaction',
  PAVING = 'paving',
  CONCRETE = 'concrete',
  TRANSPORT = 'transport',
  LIFTING = 'lifting',
  DRILLING_BREAKING = 'drilling_breaking',
  SIGNAGE = 'signage',
  SITE_EQUIPMENT = 'site_equipment',
  SURVEYING = 'surveying',
  LIGHT_VEHICLE = 'light_vehicle',
}

/**
 * How the organization came to have the machine — which decides what it costs
 * per day (see `equipmentDailyCost`):
 *
 *   - `cash_purchase` / `credit_purchase`: owned, so its cost is depreciation.
 *     Credit changes how it was paid, not what it wears out at — the interest
 *     is a financial charge, not a worksite cost.
 *   - `leasing` (crédit-bail) / `long_term_rental` (LLD): a monthly payment
 *     for the length of the contract.
 *   - `short_term_rental`: hired for a job, at a daily rate.
 */
export enum AcquisitionMethod {
  CASH_PURCHASE = 'cash_purchase',
  CREDIT_PURCHASE = 'credit_purchase',
  LEASING = 'leasing',
  LONG_TERM_RENTAL = 'long_term_rental',
  SHORT_TERM_RENTAL = 'short_term_rental',
}

/**
 * Where the machine stands in its life. `retired` — sold, scrapped, returned —
 * carries a date after which it costs nothing any more.
 */
export enum EquipmentStatus {
  IN_SERVICE = 'in_service',
  UNDER_MAINTENANCE = 'under_maintenance',
  RETIRED = 'retired',
}
