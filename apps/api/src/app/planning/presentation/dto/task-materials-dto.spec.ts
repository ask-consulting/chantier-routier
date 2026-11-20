import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PlanTaskMaterialDto, UpdateTaskMaterialDto } from './task-materials.dto';

async function invalid(cls: new () => object, body: object): Promise<string[]> {
  return (await validate(plainToInstance(cls, body))).map((error) => error.property);
}

const valid = { materialId: '2f1c6c1e-7c1f-5a52-8b8e-5d0a9f266e1d', quantity: 12.5 };

describe('PlanTaskMaterialDto', () => {
  it('accepts a quantity, with or without a price', async () => {
    expect(await invalid(PlanTaskMaterialDto, valid)).toEqual([]);
    expect(await invalid(PlanTaskMaterialDto, { ...valid, unitPrice: 45_000 })).toEqual([]);
    expect(await invalid(PlanTaskMaterialDto, { ...valid, unitPrice: null })).toEqual([]);
  });

  it('keeps a quantity positive, and to the gram of a tonne', async () => {
    expect(await invalid(PlanTaskMaterialDto, { ...valid, quantity: 0 })).toContain('quantity');
    expect(await invalid(PlanTaskMaterialDto, { ...valid, quantity: -1 })).toContain('quantity');
    expect(await invalid(PlanTaskMaterialDto, { ...valid, quantity: 1.2345 })).toContain('quantity');
    expect(await invalid(PlanTaskMaterialDto, { ...valid, quantity: '12' })).toContain('quantity');
  });

  it('wants a price in whole smallest units', async () => {
    expect(await invalid(PlanTaskMaterialDto, { ...valid, unitPrice: 4.5 })).toContain('unitPrice');
    expect(await invalid(PlanTaskMaterialDto, { ...valid, unitPrice: -1 })).toContain('unitPrice');
  });

  it('wants a UUID for the material', async () => {
    expect(await invalid(PlanTaskMaterialDto, { ...valid, materialId: 'sand' })).toContain(
      'materialId',
    );
  });
});

describe('UpdateTaskMaterialDto', () => {
  it('changes either, or takes the price away', async () => {
    expect(await invalid(UpdateTaskMaterialDto, {})).toEqual([]);
    expect(await invalid(UpdateTaskMaterialDto, { quantity: 3 })).toEqual([]);
    expect(await invalid(UpdateTaskMaterialDto, { unitPrice: null })).toEqual([]);
    expect(await invalid(UpdateTaskMaterialDto, { quantity: 0 })).toContain('quantity');
  });
});
