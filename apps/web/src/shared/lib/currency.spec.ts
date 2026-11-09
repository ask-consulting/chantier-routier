import { afterEach, describe, expect, it } from 'vitest';
import { fromStoredAmount, getCurrency, setCurrency, toStoredAmount } from './currency';

describe('the session currency', () => {
  afterEach(() => setCurrency(null));

  it('is the dinar until a session says otherwise', () => {
    expect(getCurrency()).toBe('TND');
    expect(toStoredAmount(6.5)).toBe(6500);
    expect(fromStoredAmount(6500)).toBe(6.5);
  });

  it('follows the organization', () => {
    setCurrency('EUR');

    expect(toStoredAmount(6.5)).toBe(650);
    expect(fromStoredAmount(650)).toBe(6.5);
  });
});
