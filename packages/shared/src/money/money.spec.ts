import { describe, expect, it } from 'vitest';
import { currencyDigits, fromMinorUnits, roundMinor, toMinorUnits } from './money';

describe('money', () => {
  it('knows that a dinar has three decimals and a euro two', () => {
    expect(currencyDigits('TND')).toBe(3);
    expect(currencyDigits('EUR')).toBe(2);
  });

  it('assumes two decimals for a currency it does not list', () => {
    expect(currencyDigits('CAD')).toBe(2);
  });

  it('gives the same input a different meaning in each currency', () => {
    expect(toMinorUnits(6.5, 'TND')).toBe(6500);
    expect(toMinorUnits(6.5, 'EUR')).toBe(650);
    expect(fromMinorUnits(1000, 'TND')).toBe(1);
    expect(fromMinorUnits(1000, 'EUR')).toBe(10);
  });

  it('is not fooled by binary fractions', () => {
    expect(toMinorUnits(1.005, 'TND')).toBe(1005);
    expect(toMinorUnits(0.07, 'EUR')).toBe(7);
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999);
  });

  it('round-trips an amount', () => {
    for (const amount of [0, 1, 6.5, 1234.567, 99999999.999]) {
      expect(fromMinorUnits(toMinorUnits(amount, 'TND'), 'TND')).toBe(amount);
    }
  });

  it('rounds to a whole unit', () => {
    expect(roundMinor(1234.5)).toBe(1235);
    expect(roundMinor(1234.4)).toBe(1234);
  });
});
