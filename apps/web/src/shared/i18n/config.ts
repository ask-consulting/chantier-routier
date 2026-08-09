/**
 * The languages the product speaks.
 *
 * No locale prefix in the URL: `/chantiers` is `/chantiers` in both languages,
 * and the choice lives in a cookie. The trade was deliberate — shorter, stable
 * URLs, at the cost of not being able to send a colleague a link *in Arabic*.
 * For an authenticated back-office where nobody links in from outside, that is
 * the right way round.
 */

export const LOCALES = ['fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

/** Name of the cookie holding the preference. Read on the server, written by the switcher. */
export const LOCALE_COOKIE = 'chantia.locale';

/** A year: the language is a settled preference, not a session detail. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  // Written in the language itself: someone looking for Arabic is not
  // necessarily reading the French word for it.
  ar: 'العربية',
};

/** Arabic is written right to left; everything else here is not. */
export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * The tag handed to `Intl` for numbers and dates.
 *
 * `-u-nu-latn` forces Latin digits in Arabic. Eastern Arabic numerals (٠١٢٣)
 * are correct for the Middle East but are not what Maghreb business writing
 * uses, and they would make a column of costs unreadable for a French-speaking
 * site manager looking at the same table.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
