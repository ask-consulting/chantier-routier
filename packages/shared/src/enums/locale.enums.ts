/**
 * The languages the product speaks.
 *
 * Shared rather than declared twice: the web picks its message bundle from it,
 * the API stores it on the account, and a language added here has to be handled
 * on both sides or it will not compile.
 */
export enum Locale {
  FRENCH = 'fr',
  ARABIC = 'ar',
}

export const DEFAULT_LOCALE = Locale.FRENCH;

/** Arabic is written right to left; everything else here is not. */
export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === Locale.ARABIC ? 'rtl' : 'ltr';
}

/**
 * The tag handed to `Intl` for numbers and dates.
 *
 * `-u-nu-latn` forces Latin digits in Arabic. Eastern Arabic numerals are
 * correct for the Middle East but are not what Maghreb business writing uses,
 * and a column of costs would become unreadable for a French-speaking site
 * manager looking at the same table.
 *
 * `ar-MA` already yields Latin digits in CLDR, so this is belt and braces — kept
 * because it states the intent, and because it would still hold if the locale
 * ever moved to `ar-EG`.
 */
export function intlLocale(locale: Locale): string {
  return locale === Locale.ARABIC ? 'ar-MA-u-nu-latn' : 'fr-FR';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.values(Locale).includes(value as Locale);
}
