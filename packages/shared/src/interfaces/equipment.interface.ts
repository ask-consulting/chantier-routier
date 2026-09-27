import { AcquisitionMethod, EquipmentStatus } from '../enums/equipment.enums';

/**
 * A machine of the organization's fleet — owned, leased or hired.
 *
 * Money fields (`purchasePrice` to `dailyCost`) are **omitted entirely** for a
 * caller without `budget:read`, the same rule as a worksite's budget:
 * `undefined` means "not allowed to know", `null` "not set".
 */
export interface IEquipment {
  id: string;
  organizationId: string;
  /** A code of the catalog — `GET /equipment-catalog`. */
  typeCode: string;
  /** What people call it — "Pelle CAT 320 n°2". */
  designation: string;
  /** Fleet number (numéro de parc), unique within the organization. */
  fleetNumber: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  /** Registration plate, for what drives on the road. */
  registrationNumber: string | null;
  manufactureYear: number | null;
  status: EquipmentStatus;
  acquisitionMethod: AcquisitionMethod;
  /** `YYYY-MM-DD`. */
  acquisitionDate: string;
  /** Lessor, rental company or seller. */
  supplier: string | null;
  /** `YYYY-MM-DD` — leasing and rentals. */
  contractEndDate: string | null;
  /** `YYYY-MM-DD` — set when retired. */
  disposalDate: string | null;
  notes: string | null;

  purchasePrice?: number | null;
  residualValue?: number | null;
  usefulLifeMonths?: number | null;
  /** Computed — owned machines only. */
  depreciationEndDate?: string | null;
  monthlyPayment?: number | null;
  /** Leasing only: the price of keeping it at the end. */
  buyoutValue?: number | null;
  dailyRate?: number | null;
  /** Computed for today. */
  dailyCost?: number;
  /** Computed for today — owned machines only. */
  netBookValue?: number | null;

  createdAt?: string;
  updatedAt?: string;
}

/** Payload to add a machine to the fleet. */
export interface ICreateEquipment {
  typeCode: string;
  designation: string;
  fleetNumber?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  registrationNumber?: string | null;
  manufactureYear?: number | null;
  status?: EquipmentStatus;
  acquisitionMethod: AcquisitionMethod;
  acquisitionDate: string;
  supplier?: string | null;
  purchasePrice?: number | null;
  residualValue?: number | null;
  /** Defaults to the type's lifetime for an owned machine. */
  usefulLifeMonths?: number | null;
  monthlyPayment?: number | null;
  buyoutValue?: number | null;
  dailyRate?: number | null;
  contractEndDate?: string | null;
  disposalDate?: string | null;
  notes?: string | null;
}

/** Payload to change a machine. Every field optional; `null` clears. */
export type IUpdateEquipment = Partial<ICreateEquipment>;

/**
 * A label in every language the database has for it, keyed by language code:
 * `{ fr: 'Niveleuse', ar: 'ممهدة' }`. A language is added by inserting rows,
 * so a client must expect keys it does not speak — and a missing one; see
 * `translated`.
 */
export type Translations = Readonly<Record<string, string>>;

/**
 * One type of the equipment catalog. The catalog is global — the same for
 * every organization — and written only by migrations; it is served by
 * `GET /equipment-catalog` with all its labels, the client picking its language.
 */
export interface IEquipmentType {
  code: string;
  categoryCode: string;
  /** Straight-line lifetime proposed for a new owned machine of this type. */
  defaultUsefulLifeMonths: number;
  labels: Translations;
}

/** A family of the catalog, with its types — already in display order. */
export interface IEquipmentCategory {
  code: string;
  labels: Translations;
  types: IEquipmentType[];
}
