import {
  AcquisitionMethod,
  EquipmentStatus,
  depreciationEndDate,
  equipmentDailyCost,
  equipmentType,
  isOwned,
  netBookValue,
  type EquipmentCostInput,
} from '@chantia/shared';
import { FieldError } from '@shared/domain/domain.exception';
import { InvalidEquipmentException } from '../exceptions/equipment.exceptions';

/** Every field a machine carries, dates as `YYYY-MM-DD`. */
export interface EquipmentProps {
  id: string;
  organizationId: string;
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
  usefulLifeMonths?: number | null;
  monthlyPayment?: number | null;
  buyoutValue?: number | null;
  dailyRate?: number | null;
  contractEndDate?: string | null;
  disposalDate?: string | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EquipmentChanges = Partial<Omit<EquipmentProps, 'id' | 'organizationId' | 'deletedAt'>>;

type Normalized = Required<Omit<EquipmentProps, 'createdAt' | 'updatedAt'>> &
  Pick<EquipmentProps, 'createdAt' | 'updatedAt'>;

/**
 * Equipment aggregate root — one machine of the fleet.
 *
 * It owns the rules that make its cost computable, so no write path can skip
 * them:
 *
 *   - **The type is in the catalog.** An unknown code would have no category
 *     and no default lifetime.
 *   - **The money matches how it was acquired.** Owned: a price and a
 *     lifetime (the type's by default), a residual value no higher than the
 *     price. Leasing and long-term rental: a monthly payment and a contract
 *     end. Short-term rental: a daily rate. Fields of the other methods are
 *     cleared — switching a leased machine to "bought" does not leave a stale
 *     monthly payment behind.
 *   - **Retired means a disposal date**, and only retired does.
 *   - **No date runs backwards** from the acquisition.
 */
export class Equipment {
  private constructor(private readonly props: Normalized) {}

  static create(input: EquipmentProps): Equipment {
    const props = Equipment.normalize(input);
    const errors = Equipment.check(props);
    if (errors.length > 0) {
      throw new InvalidEquipmentException(errors);
    }
    return new Equipment(props);
  }

  private static normalize(input: EquipmentProps): Normalized {
    const method = input.acquisitionMethod;
    const owned = isOwned(method);
    const leased =
      method === AcquisitionMethod.LEASING || method === AcquisitionMethod.LONG_TERM_RENTAL;
    const hired = method === AcquisitionMethod.SHORT_TERM_RENTAL;
    const status = input.status ?? EquipmentStatus.IN_SERVICE;

    return {
      id: input.id,
      organizationId: input.organizationId,
      typeCode: input.typeCode,
      designation: input.designation.trim(),
      fleetNumber: clean(input.fleetNumber),
      brand: clean(input.brand),
      model: clean(input.model),
      serialNumber: clean(input.serialNumber),
      registrationNumber: clean(input.registrationNumber)?.toUpperCase() ?? null,
      manufactureYear: input.manufactureYear ?? null,
      status,
      acquisitionMethod: method,
      acquisitionDate: day(input.acquisitionDate),
      supplier: clean(input.supplier),
      purchasePrice: owned ? (input.purchasePrice ?? null) : null,
      residualValue: owned ? (input.residualValue ?? null) : null,
      usefulLifeMonths: owned
        ? (input.usefulLifeMonths ?? equipmentType(input.typeCode)?.defaultUsefulLifeMonths ?? null)
        : null,
      monthlyPayment: leased ? (input.monthlyPayment ?? null) : null,
      buyoutValue: method === AcquisitionMethod.LEASING ? (input.buyoutValue ?? null) : null,
      dailyRate: hired ? (input.dailyRate ?? null) : null,
      contractEndDate: owned ? null : input.contractEndDate ? day(input.contractEndDate) : null,
      disposalDate:
        status === EquipmentStatus.RETIRED && input.disposalDate ? day(input.disposalDate) : null,
      notes: clean(input.notes),
      deletedAt: input.deletedAt ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  private static check(props: Normalized): FieldError[] {
    const errors: FieldError[] = [];
    const fail = (field: string, code: string, message: string): void => {
      errors.push({ field, code: `form.errors.${code}`, message });
    };
    const method = props.acquisitionMethod;

    if (!equipmentType(props.typeCode)) {
      fail('typeCode', 'unknownEquipmentType', `Unknown equipment type ${props.typeCode}`);
    }
    if (props.designation.length === 0) {
      fail('designation', 'required', 'A designation is required');
    }

    if (isOwned(method)) {
      if (!props.purchasePrice || props.purchasePrice <= 0) {
        fail('purchasePrice', 'required', 'An owned machine needs a purchase price');
      }
      if (!props.usefulLifeMonths || props.usefulLifeMonths <= 0) {
        fail('usefulLifeMonths', 'required', 'An owned machine needs a lifetime');
      }
      if (
        props.residualValue !== null &&
        props.purchasePrice !== null &&
        props.residualValue > props.purchasePrice
      ) {
        fail('residualValue', 'residualAbovePrice', 'The residual value exceeds the price');
      }
    } else if (method === AcquisitionMethod.SHORT_TERM_RENTAL) {
      if (!props.dailyRate || props.dailyRate <= 0) {
        fail('dailyRate', 'required', 'A hired machine needs a daily rate');
      }
    } else {
      if (!props.monthlyPayment || props.monthlyPayment <= 0) {
        fail('monthlyPayment', 'required', 'A leased machine needs a monthly payment');
      }
      if (!props.contractEndDate) {
        fail('contractEndDate', 'required', 'A lease needs an end date');
      }
    }

    if (props.contractEndDate && props.contractEndDate < props.acquisitionDate) {
      fail('contractEndDate', 'endBeforeStart', 'The contract ends before it starts');
    }
    if (props.status === EquipmentStatus.RETIRED && !props.disposalDate) {
      fail('disposalDate', 'required', 'A retired machine needs a disposal date');
    }
    if (props.disposalDate && props.disposalDate < props.acquisitionDate) {
      fail('disposalDate', 'endBeforeStart', 'The disposal precedes the acquisition');
    }

    return errors;
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get typeCode(): string {
    return this.props.typeCode;
  }
  get designation(): string {
    return this.props.designation;
  }
  get fleetNumber(): string | null {
    return this.props.fleetNumber;
  }
  get brand(): string | null {
    return this.props.brand;
  }
  get model(): string | null {
    return this.props.model;
  }
  get serialNumber(): string | null {
    return this.props.serialNumber;
  }
  get registrationNumber(): string | null {
    return this.props.registrationNumber;
  }
  get manufactureYear(): number | null {
    return this.props.manufactureYear;
  }
  get status(): EquipmentStatus {
    return this.props.status;
  }
  get acquisitionMethod(): AcquisitionMethod {
    return this.props.acquisitionMethod;
  }
  get acquisitionDate(): string {
    return this.props.acquisitionDate;
  }
  get supplier(): string | null {
    return this.props.supplier;
  }
  get purchasePrice(): number | null {
    return this.props.purchasePrice;
  }
  get residualValue(): number | null {
    return this.props.residualValue;
  }
  get usefulLifeMonths(): number | null {
    return this.props.usefulLifeMonths;
  }
  get monthlyPayment(): number | null {
    return this.props.monthlyPayment;
  }
  get buyoutValue(): number | null {
    return this.props.buyoutValue;
  }
  get dailyRate(): number | null {
    return this.props.dailyRate;
  }
  get contractEndDate(): string | null {
    return this.props.contractEndDate;
  }
  get disposalDate(): string | null {
    return this.props.disposalDate;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  /** The inputs of every cost computation — see `equipment-costs.ts`. */
  get costInput(): EquipmentCostInput {
    return this.props;
  }

  get depreciationEndDate(): string | null {
    return depreciationEndDate(this.props);
  }

  dailyCostOn(day: string): number {
    return equipmentDailyCost(this.props, day);
  }

  netBookValueOn(day: string): number | null {
    return netBookValue(this.props, day);
  }

  /**
   * A changed copy, re-validated. `undefined` leaves a field, `null` clears
   * it. Changing the type of an owned machine keeps its lifetime: the
   * type's default only fills a lifetime that was never set.
   */
  with(changes: EquipmentChanges): Equipment {
    const merged: EquipmentProps = { ...this.props };
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
    return Equipment.create(merged);
  }

  /** Marks this machine removed, without discarding it. */
  deleted(at: Date = new Date()): Equipment {
    return new Equipment({ ...this.props, deletedAt: at });
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** The day part of an ISO date — `2026-09-01T00:00:00Z` and `2026-09-01` alike. */
function day(value: string): string {
  return value.slice(0, 10);
}
