import { describe, expect, it } from 'vitest';
import { plannedMaterialCost } from './materials';

describe('plannedMaterialCost', () => {
  it('multiplies the quantity by the unit price', () => {
    expect(plannedMaterialCost(12, 45_000)).toBe(540_000);
  });

  it('rounds to the smallest unit', () => {
    // 2.5 t at 33.333 TND: 83.3325 TND, kept in millimes.
    expect(plannedMaterialCost(2.5, 33_333)).toBe(83_333);
  });

  it('is null without a price', () => {
    expect(plannedMaterialCost(12, null)).toBeNull();
  });
});
