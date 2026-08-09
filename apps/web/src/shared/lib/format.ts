import { intlLocale, type Locale } from '@/shared/i18n/config';

/**
 * Money and dates, formatted for the reading language.
 *
 * Arabic resolves to `ar-MA-u-nu-latn` — Latin digits. Eastern Arabic numerals
 * are correct for the Middle East but are not what Maghreb business writing
 * uses, and a French-speaking site manager reading the same table would lose it
 * entirely. See `shared/i18n/config.ts`.
 *
 * These live in `shared` rather than in a feature because a euro is a euro
 * whatever the screen: a worksite budget, a worker's day rate and an expense all
 * read the same way. Anything that formats *a particular domain* — the colour of
 * a status, the sign of a variance — belongs to that feature's `model/` instead.
 */

export function formatAmount(value: number | null | undefined, locale: Locale): string {
  // An em dash for a missing amount — never `0 €`, which is a real figure.
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
