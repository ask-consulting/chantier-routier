import { describe, expect, it } from 'vitest';
import { formatAmount, formatDate } from './format';

/**
 * Two functions, and one decision each that a reader of the code would not guess.
 *
 * Both are about *absence*: a missing amount is an em dash and never `0 €`,
 * because zero is a real figure — a chantier with no budget entered and one
 * budgeted at nothing are not the same thing, and a table that shows them alike
 * hides the first.
 *
 * The Arabic case pins the choice made in `shared/i18n/config.ts`: Latin digits,
 * because Maghreb business writing uses them and a French-speaking site manager
 * reading the same column would lose Eastern Arabic numerals entirely.
 */

describe('formatAmount', () => {
  it('shows an em dash for a missing amount, never zero', () => {
    expect(formatAmount(null, 'fr')).toBe('—');
    expect(formatAmount(undefined, 'fr')).toBe('—');
  });

  it('shows a real zero as a real zero', () => {
    expect(formatAmount(0, 'fr')).not.toBe('—');
    expect(formatAmount(0, 'fr')).toMatch(/0/);
  });

  it('formats in euros, without centimes', () => {
    const formatted = formatAmount(12500.4, 'fr');

    expect(formatted).toMatch(/12\s?500/);
    expect(formatted).toMatch(/€/);
    expect(formatted).not.toMatch(/,4|\.4/);
  });

  it('keeps Latin digits in Arabic', () => {
    const formatted = formatAmount(12500, 'ar');

    expect(formatted).toMatch(/12/);
    // Eastern Arabic numerals (٠-٩) must not appear.
    expect(formatted).not.toMatch(/[٠-٩]/);
  });
});

describe('formatDate', () => {
  it('shows an em dash for a missing date', () => {
    expect(formatDate(null, 'fr')).toBe('—');
    expect(formatDate(undefined, 'fr')).toBe('—');
    expect(formatDate('', 'fr')).toBe('—');
  });

  it('formats an ISO date for the reading language', () => {
    expect(formatDate('2026-03-15', 'fr')).toMatch(/15/);
    expect(formatDate('2026-03-15', 'fr')).toMatch(/2026/);
  });

  it('keeps Latin digits in Arabic here too', () => {
    const formatted = formatDate('2026-03-15', 'ar');

    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });
});
