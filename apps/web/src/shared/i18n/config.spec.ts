import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_CODES,
  LOCALE_LABELS,
  directionOf,
  intlLocale,
  isLocale,
} from './config';

/**
 * The four facts every screen depends on: which languages exist, which way each
 * one is written, which tag `Intl` gets, and whether a value off the wire is one
 * of them.
 *
 * `isLocale` is the one that matters most: it guards a cookie and an API
 * payload, so it has to refuse everything that is not exactly `fr` or `ar` —
 * including the near-misses (`FR`, `fr-FR`) that look right in a log.
 */

describe('locales', () => {
  it('speaks French and Arabic, and defaults to French', () => {
    expect([...LOCALES]).toEqual(['fr', 'ar']);
    expect(DEFAULT_LOCALE).toBe('fr');
  });

  it('names each language in itself, and abbreviates both for the narrow rail', () => {
    expect(LOCALE_LABELS.fr).toBe('Français');
    expect(LOCALE_LABELS.ar).toBe('العربية');
    expect(LOCALE_CODES).toEqual({ fr: 'FR', ar: 'AR' });
  });
});

describe('directionOf', () => {
  it('writes Arabic right to left, and French the other way', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('fr')).toBe('ltr');
  });
});

describe('intlLocale', () => {
  it('forces Latin digits in Arabic', () => {
    expect(intlLocale('ar')).toBe('ar-MA-u-nu-latn');
    expect(intlLocale('fr')).toBe('fr-FR');
  });
});

describe('isLocale', () => {
  it('accepts exactly the two we speak', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('ar')).toBe(true);
  });

  it('refuses the near-misses, which is the whole point of having it', () => {
    expect(isLocale('FR')).toBe(false);
    expect(isLocale('fr-FR')).toBe(false);
    expect(isLocale('en')).toBe(false);
    expect(isLocale('')).toBe(false);
  });

  it('refuses anything that is not a string', () => {
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale(['fr'])).toBe(false);
  });
});
