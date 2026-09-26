import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AcquisitionMethod } from '@chantia/shared';
import { CreateEquipmentDto } from './create-equipment.dto';
import { GetEquipmentListDto } from './get-equipment-list.dto';
import { UpdateEquipmentDto } from './update-equipment.dto';

async function invalid(cls: new () => object, body: object): Promise<string[]> {
  return (await validate(plainToInstance(cls, body))).map((error) => error.property);
}

const valid = {
  typeCode: 'bulldozer',
  designation: 'Bull D6',
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-15',
  purchasePrice: 1_250_000.5,
};

describe('CreateEquipmentDto', () => {
  it('accepts a complete purchase', async () => {
    expect(await invalid(CreateEquipmentDto, valid)).toEqual([]);
  });

  it('refuses a type outside the catalog', async () => {
    expect(await invalid(CreateEquipmentDto, { ...valid, typeCode: 'spaceship' })).toContain(
      'typeCode',
    );
  });

  it('takes a day, not an instant — nor a day that does not exist', async () => {
    expect(
      await invalid(CreateEquipmentDto, { ...valid, acquisitionDate: '2026-01-15T01:00:00+02:00' }),
    ).toContain('acquisitionDate');
    expect(await invalid(CreateEquipmentDto, { ...valid, acquisitionDate: '2026-02-30' })).toContain(
      'acquisitionDate',
    );
  });

  it('counts money to the millime, never below zero', async () => {
    expect(await invalid(CreateEquipmentDto, { ...valid, purchasePrice: 1.2345 })).toContain(
      'purchasePrice',
    );
    expect(await invalid(CreateEquipmentDto, { ...valid, dailyRate: -1 })).toContain('dailyRate');
  });

  it('bounds the lifetime and the year', async () => {
    const errors = await invalid(CreateEquipmentDto, {
      ...valid,
      usefulLifeMonths: 0,
      manufactureYear: 1900,
    });
    expect(errors).toEqual(expect.arrayContaining(['usefulLifeMonths', 'manufactureYear']));
  });
});

describe('UpdateEquipmentDto', () => {
  it('accepts an empty change, and still checks what is sent', async () => {
    expect(await invalid(UpdateEquipmentDto, {})).toEqual([]);
    expect(await invalid(UpdateEquipmentDto, { disposalDate: 'yesterday' })).toContain(
      'disposalDate',
    );
  });
});

describe('GetEquipmentListDto', () => {
  it('refuses to sort by money', async () => {
    expect(await invalid(GetEquipmentListDto, { sortField: 'purchasePrice' })).toContain(
      'sortField',
    );
  });

  it('refuses an unknown category', async () => {
    expect(await invalid(GetEquipmentListDto, { category: 'boats' })).toContain('category');
  });
});
