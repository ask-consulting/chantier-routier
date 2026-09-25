import { describe, expect, it } from 'vitest';
import { AcquisitionMethod, EquipmentStatus } from '@chantia/shared';
import { InvalidEquipmentException } from '../exceptions/equipment.exceptions';
import { Equipment, type EquipmentProps } from './equipment.entity';

/**
 * The rules that make a machine's cost computable. Each failure is pinned to
 * its field, all at once, so a form can mark every one in a single round trip.
 */

const bought: EquipmentProps = {
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'crawler_excavator',
  designation: ' Pelle CAT 320 n°2 ',
  fleetNumber: ' PL-02 ',
  registrationNumber: '215 tu 4521',
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-01',
  purchasePrice: 365_000,
};

function fieldsOf(attempt: () => unknown): string[] {
  try {
    attempt();
  } catch (error) {
    if (error instanceof InvalidEquipmentException) {
      return (error.fieldErrors ?? []).map((field) => field.field);
    }
    throw error;
  }
  return [];
}

describe('Equipment — an owned machine', () => {
  it('takes its lifetime from the catalog, and cleans its text', () => {
    const equipment = Equipment.create(bought);

    expect(equipment.usefulLifeMonths).toBe(60);
    expect(equipment.depreciationEndDate).toBe('2030-12-31');
    expect(equipment.designation).toBe('Pelle CAT 320 n°2');
    expect(equipment.fleetNumber).toBe('PL-02');
    expect(equipment.registrationNumber).toBe('215 TU 4521');
    expect(equipment.status).toBe(EquipmentStatus.IN_SERVICE);
  });

  it('keeps a lifetime set by hand', () => {
    expect(Equipment.create({ ...bought, usefulLifeMonths: 12 }).dailyCostOn('2026-06-01')).toBeCloseTo(
      1_000,
    );
  });

  it('needs a price, and a residual value no higher than it', () => {
    expect(fieldsOf(() => Equipment.create({ ...bought, purchasePrice: null }))).toEqual([
      'purchasePrice',
    ]);
    expect(
      fieldsOf(() => Equipment.create({ ...bought, residualValue: 400_000 })),
    ).toEqual(['residualValue']);
  });

  it('drops the fields of the other acquisition methods', () => {
    const equipment = Equipment.create({
      ...bought,
      monthlyPayment: 3_000,
      dailyRate: 200,
      contractEndDate: '2027-01-01',
    });

    expect(equipment.monthlyPayment).toBeNull();
    expect(equipment.dailyRate).toBeNull();
    expect(equipment.contractEndDate).toBeNull();
  });

  it('knows its book value', () => {
    expect(Equipment.create({ ...bought, usefulLifeMonths: 12 }).netBookValueOn('2026-01-10')).toBe(
      355_000,
    );
  });
});

describe('Equipment — leased and hired', () => {
  const leased: EquipmentProps = {
    ...bought,
    acquisitionMethod: AcquisitionMethod.LEASING,
    purchasePrice: null,
    monthlyPayment: 3_650,
    buyoutValue: 20_000,
    contractEndDate: '2029-12-31',
  };

  it('needs a payment and a contract end', () => {
    expect(
      fieldsOf(() => Equipment.create({ ...leased, monthlyPayment: null, contractEndDate: null })),
    ).toEqual(['monthlyPayment', 'contractEndDate']);
  });

  it('keeps a buyout value for a lease only', () => {
    expect(Equipment.create(leased).buyoutValue).toBe(20_000);
    expect(
      Equipment.create({ ...leased, acquisitionMethod: AcquisitionMethod.LONG_TERM_RENTAL })
        .buyoutValue,
    ).toBeNull();
  });

  it('has no lifetime or depreciation of its own', () => {
    const equipment = Equipment.create(leased);

    expect(equipment.usefulLifeMonths).toBeNull();
    expect(equipment.depreciationEndDate).toBeNull();
    expect(equipment.dailyCostOn('2026-06-01')).toBeCloseTo(120);
  });

  it('hired short-term, needs a daily rate', () => {
    expect(
      fieldsOf(() =>
        Equipment.create({ ...bought, acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL }),
      ),
    ).toEqual(['dailyRate']);
  });

  it('refuses a contract that ends before it starts', () => {
    expect(fieldsOf(() => Equipment.create({ ...leased, contractEndDate: '2025-01-01' }))).toEqual([
      'contractEndDate',
    ]);
  });
});

describe('Equipment — type, status and changes', () => {
  it('refuses a type the catalog does not know, and an empty designation', () => {
    // And no lifetime either: an unknown type has no default to lend.
    expect(
      fieldsOf(() => Equipment.create({ ...bought, typeCode: 'spaceship', designation: '  ' })),
    ).toEqual(['typeCode', 'designation', 'usefulLifeMonths']);
  });

  it('needs a disposal date once retired, and ignores one otherwise', () => {
    expect(fieldsOf(() => Equipment.create({ ...bought, status: EquipmentStatus.RETIRED }))).toEqual(
      ['disposalDate'],
    );
    expect(Equipment.create({ ...bought, disposalDate: '2027-01-01' }).disposalDate).toBeNull();
    expect(
      fieldsOf(() =>
        Equipment.create({
          ...bought,
          status: EquipmentStatus.RETIRED,
          disposalDate: '2025-01-01',
        }),
      ),
    ).toEqual(['disposalDate']);
  });

  it('re-checks the whole on a change: switching to leasing needs its fields', () => {
    const equipment = Equipment.create(bought);

    expect(
      fieldsOf(() => equipment.with({ acquisitionMethod: AcquisitionMethod.LEASING })),
    ).toEqual(['monthlyPayment', 'contractEndDate']);

    const leased = equipment.with({
      acquisitionMethod: AcquisitionMethod.LEASING,
      monthlyPayment: 3_000,
      contractEndDate: '2029-12-31',
    });
    expect(leased.purchasePrice).toBeNull();
  });

  it('clears a field on null, and leaves it on undefined', () => {
    const equipment = Equipment.create({ ...bought, brand: 'Caterpillar', model: '320' });

    const changed = equipment.with({ brand: null, model: undefined });

    expect(changed.brand).toBeNull();
    expect(changed.model).toBe('320');
  });

  it('marks itself deleted and keeps the rest', () => {
    const deleted = Equipment.create(bought).deleted(new Date('2026-09-27'));

    expect(deleted.isDeleted()).toBe(true);
    expect(deleted.designation).toBe('Pelle CAT 320 n°2');
  });
});
